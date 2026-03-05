import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Message, File, AgentType, Project } from '@/store/useWorkspaceStore';
import { AGENTS } from './agents';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

const manageRequirementsStateDeclaration: FunctionDeclaration = {
  name: 'manage_requirements_state',
  description: 'Updates the PRD data or manages the question stack.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: 'The action to perform: "update_prd", "add_question", "resolve_question", or "remove_question".',
      },
      prd_updates: {
        type: Type.OBJECT,
        description: 'Key-value pairs to update in the PRD JSON structure. Required if action is "update_prd".',
      },
      question_id: {
        type: Type.STRING,
        description: 'The ID of the question. Required if action is "resolve_question" or "remove_question".',
      },
      question_text: {
        type: Type.STRING,
        description: 'The text of the new question. Required if action is "add_question".',
      },
    },
    required: ['action'],
  },
};

const readFileDeclaration: FunctionDeclaration = {
  name: 'readFile',
  description: 'Reads the content of a file in the project. Use this to autonomously read files when the user asks about them without explicitly tagging them.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileName: {
        type: Type.STRING,
        description: 'The exact name of the file to read (e.g., "notes.txt", "logo.png").',
      },
    },
    required: ['fileName'],
  },
};

async function fetchImageAsBase64(url: string): Promise<{ base64: string, mimeType: string } | null> {
  try {
    const response = await fetch(`/api/fetch-image?url=${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching image via proxy:", error);
    return null;
  }
}

async function buildParts(text: string, projectFiles: File[]) {
  const regex = /@\[(.*?)\]\((.*?)\)/g;
  const parts: any[] = [];
  let lastIndex = 0;
  
  const matches = Array.from(text.matchAll(regex));
  
  if (matches.length === 0) {
    return [{ text }];
  }
  
  for (const m of matches) {
    const preText = text.substring(lastIndex, m.index);
    if (preText) parts.push({ text: preText });
    
    const fileName = m[1];
    const fileId = m[2];
    const file = projectFiles.find(f => f.id === fileId);
    
    if (file) {
      if (file.type === 'image') {
        if (file.content.startsWith('data:')) {
          const [prefix, base64] = file.content.split(',');
          const mimeType = prefix.split(':')[1].split(';')[0];
          parts.push({
            inlineData: {
              data: base64,
              mimeType: mimeType
            }
          });
          parts.push({ text: ` [Image: ${file.name}] ` });
        } else if (file.content.startsWith('http')) {
          // It's a URL (like Firebase Storage or Picsum), we need to fetch it
          const imageData = await fetchImageAsBase64(file.content);
          if (imageData) {
            parts.push({
              inlineData: {
                data: imageData.base64,
                mimeType: imageData.mimeType
              }
            });
            parts.push({ text: ` [Image: ${file.name}] ` });
          } else {
            parts.push({ text: ` [Image URL (could not load): ${file.content}] ` });
          }
        } else {
          parts.push({ text: ` [Image URL: ${file.content}] ` });
        }
      } else {
        parts.push({ text: `\n--- Content of ${file.name} ---\n${file.content}\n--- End of ${file.name} ---\n` });
      }
    } else {
      parts.push({ text: `@[${fileName}](${fileId})` });
    }
    
    lastIndex = m.index! + m[0].length;
  }
  
  const postText = text.substring(lastIndex);
  if (postText) parts.push({ text: postText });
  
  return parts;
}

export async function generateAgentResponse(
  agentType: AgentType,
  messageHistory: Message[],
  project: Project,
  newMessage: string,
  callbacks?: {
    onUpdatePrd?: (updates: any) => void;
    onManageQuestion?: (action: 'add' | 'update_status' | 'delete', payload: any) => void;
  }
): Promise<string> {
  const agent = AGENTS[agentType];
  
  // Create context from files
  let fileContext = '';
  if (project.files.length > 0) {
    fileContext = '\n\n--- AVAILABLE PROJECT FILES ---\n';
    fileContext += 'The user has the following files in their project. If they tag a file (e.g. @filename), its content or image data will be provided in the message.\n';
    project.files.forEach((file) => {
      fileContext += `- ${file.name} (${file.type})\n`;
    });
    fileContext += '--- END AVAILABLE PROJECT FILES ---\n';
  }

  // Create context from PRD and Questions
  let stateContext = '\n\n--- CURRENT PROJECT STATE ---\n';
  stateContext += `PRD Data:\n${JSON.stringify(project.prdData, null, 2)}\n\n`;
  stateContext += `Questions:\n${JSON.stringify(project.questions, null, 2)}\n`;
  stateContext += '--- END CURRENT PROJECT STATE ---\n';

  const systemInstruction = agent.systemPrompt + fileContext + stateContext;

  try {
    const contents = [];
    
    for (const msg of messageHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: await buildParts(msg.content, project.files)
      });
    }
    
    contents.push({
      role: 'user',
      parts: await buildParts(newMessage, project.files)
    });

    let currentContents = [...contents];
    let finalResponseText = '';
    let iterations = 0;
    const MAX_ITERATIONS = 5; // Allow a few more iterations for multiple tool calls

    while (iterations < MAX_ITERATIONS) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: currentContents as any,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [manageRequirementsStateDeclaration, readFileDeclaration] }],
        },
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        // 1. Append the model's function call message to the history
        const functionCallMessage = response.candidates?.[0]?.content;
        if (functionCallMessage) {
          currentContents.push({
            role: functionCallMessage.role || 'model',
            parts: functionCallMessage.parts || []
          });
        }

        // 2. Execute the tools and gather responses
        const functionResponseParts: any[] = [];

        for (const call of functionCalls) {
          if (call.name === 'manage_requirements_state' && call.args) {
            const action = call.args.action as string;
            
            if (action === 'update_prd' && call.args.prd_updates) {
              if (callbacks?.onUpdatePrd) {
                callbacks.onUpdatePrd(call.args.prd_updates);
              }
              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { success: true, message: 'PRD updated successfully.' }
                }
              });
            } else if (action === 'add_question' && call.args.question_text) {
              if (callbacks?.onManageQuestion) {
                callbacks.onManageQuestion('add', { text: call.args.question_text });
              }
              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { success: true, message: 'Question added successfully.' }
                }
              });
            } else if (action === 'resolve_question' && call.args.question_id) {
              if (callbacks?.onManageQuestion) {
                callbacks.onManageQuestion('update_status', { id: call.args.question_id, status: 'resolved' });
              }
              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { success: true, message: 'Question resolved successfully.' }
                }
              });
            } else if (action === 'remove_question' && call.args.question_id) {
              if (callbacks?.onManageQuestion) {
                callbacks.onManageQuestion('delete', { id: call.args.question_id });
              }
              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { success: true, message: 'Question removed successfully.' }
                }
              });
            } else {
              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { error: 'Invalid action or missing required arguments.' }
                }
              });
            }
          } else if (call.name === 'readFile' && call.args) {
            const fileName = call.args.fileName as string;
            const file = project.files.find(f => f.name === fileName);

            if (!file) {
              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { error: `File '${fileName}' not found in the project.` }
                }
              });
            } else {
              if (file.type === 'image') {
                let base64 = '';
                let mimeType = '';
                
                if (file.content.startsWith('data:')) {
                  const [prefix, b64] = file.content.split(',');
                  mimeType = prefix.split(':')[1].split(';')[0];
                  base64 = b64;
                } else if (file.content.startsWith('http')) {
                  const imageData = await fetchImageAsBase64(file.content);
                  if (imageData) {
                    base64 = imageData.base64;
                    mimeType = imageData.mimeType;
                  }
                }

                if (base64) {
                  functionResponseParts.push({
                    functionResponse: {
                      name: call.name,
                      response: { success: true, message: `Image data for ${fileName} is provided in the next part.` }
                    }
                  });
                  // Provide the actual image data inline
                  functionResponseParts.push({
                    inlineData: { data: base64, mimeType }
                  });
                } else {
                  functionResponseParts.push({
                    functionResponse: {
                      name: call.name,
                      response: { error: `Failed to load image data for ${fileName}.` }
                    }
                  });
                }
              } else {
                // Text or PDF (if text-based)
                functionResponseParts.push({
                  functionResponse: {
                    name: call.name,
                    response: { content: file.content }
                  }
                });
              }
            }
          }
        }

        // 3. Append the tool responses back to the model
        currentContents.push({
          role: 'user',
          parts: functionResponseParts
        });

        iterations++;
      } else {
        // No more function calls, we have our final text answer
        finalResponseText = response.text || 'No response generated.';
        break;
      }
    }

    return finalResponseText || 'Sorry, I encountered an error while processing your request.';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return 'Sorry, I encountered an error while processing your request.';
  }
}

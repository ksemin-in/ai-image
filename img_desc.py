import ollama
import os

def vision_query():
    # Initialize the client
    client = ollama.Client()

    image_path = input("Enter path to image: ").strip()
    if not os.path.exists(image_path):
        print("File not found.")
        return

    user_prompt = input("Your question: ")

    try:
        # Using client.chat instead of ollama.chat
        response = client.chat(
            model='qwen3-vl:2b',
            messages=[{
                'role': 'user',
                'content': user_prompt,
                'images': [image_path] # Ensure this is a list of paths
            }],
            options={'num_gpu': 99}
        )
        
        try:
            print("\nAI:", response['message']['content'])
        except TypeError:
            print("\nAI:", response.message.content)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    vision_query()
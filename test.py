import requests
import json

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
stream = False

headers = {
    "Authorization": "Bearer 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",
    "Accept": "application/json",
}

payload = {
  "messages": [
    {
      "content": "hi",
      "role": "user"
    }
  ],
  "model": "meta/llama-3.2-90b-vision-instruct",
  "frequency_penalty": 0,
  "max_tokens": 512,
  "presence_penalty": 0,
  "stream": stream,
  "temperature": 1,
  "top_p": 1
}

print("Sending request...")
response = requests.post(invoke_url, headers=headers, json=payload, stream=stream)
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2))
else:
    print(f"Error {response.status_code}: {response.text}")

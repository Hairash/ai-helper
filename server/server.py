from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"

# Your CV information
CV_SUMMARY = """
Ivan Grebenshchikov is a Senior Software Engineer with over 6 years of experience specializing in web and backend development, microservices design, and team leadership. He has worked at companies like CloudBlue, Yandex, and Voicelink, contributing to large-scale projects using Python, Django, FastAPI, PostgreSQL, and React.js. His expertise includes system architecture, performance optimization, and automation. Ivan is proficient in multiple programming languages and technologies, including Python, JavaScript, SQL, Docker, Redis, and RabbitMQ. He has a strong background in teaching and mentoring, and he is actively seeking opportunities in Europe.
"""

def build_conversation_text(messages):
    return "\n".join(
        f'{"Me" if m["role"] == "me" else "Recruiter"}: {m["text"]}'
        for m in messages
    )

@app.post("/ai_reply")
def ai_reply(payload: dict):
    messages = payload.get("messages", [])
    # DEBUG: print the messages in the formatted way
    print('[DEBUG] messages:\n', "\n".join(f'{m["role"]}: {m["text"]}' for m in messages))

    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    convo = build_conversation_text(messages)

    CV_SUMMARY = """
Ivan Grebenshchikov is a Senior Software Engineer with 6+ years of experience in web and backend development.

Key Skills (strong expertise):
- Python (Django, FastAPI, Flask)
- JavaScript/TypeScript (React, Vue.js)
- SQL Databases (especially PostgreSQL)
- Web Technologies (REST, HTTP)
- Git, Docker

Additional Experience (familiar but not expert):
- Redis, Celery, RabbitMQ
- MongoDB
- Cloud Platforms (Azure, AWS, GCP)
- Rust, C++, Java, C#, PHP
"""

# 6. Do NOT add a greeting if the recruiter already wrote one.
    system_prompt = f"""
You are helping Ivan Grebenshchikov reply to recruiters on LinkedIn.
Here is Ivan's CV summary for context:
{CV_SUMMARY}

Guidelines for the reply:
1. Write a short, natural, and friendly reply (2-4 sentences max).
2. Use the same language as the recruiter.
3. Keep it informal but professional.
4. Add explicit newline characters (`\n`) to make the text look natural.
5. Return only the reply text, no additional commentary.
6. Never use the em dash symbol (—). Always use a regular hyphen surrounded by spaces ( - ) instead.
7. Do not use any text formatting like markdown bold (**text**). Respond with plain regular text only.

Examples of good replies:
---
Example 1:
Hi, Artiom!\n
Thank you for the offer. Yes, I worked a lot with client-server architecture.\n
And yes, I would like to talk about it in more detail.\n
Do you have time today or on Friday? I'm in UTC+2 timezone.\n
Hope to hear from you soon!
---

Example 2:
Hi Luc,\n
Thank you for the opportunity. It sounds amazing!\n
I like the full-stack role, and I'm thrilled by your company's mission.\n
So, yes - I'd really like to discuss this in detail.\n
Would you have time tomorrow between 2:30 and 4:30 PM (UTC+2)?
---

Example 3:
Hi, Kevin!\n
\n
Sounds interesting for me.\n
I am full-stack engineer and I developed customer services. I didn't work with AI directly, but I'm interested in this and understand the value of this topic.\n
So yes, I would like to talk to you today or next week.\n
I will have quite busy Mon and Tue, but starting from Wed it's fine.\n
\n
Does it suit you?\n
All the best, Ivan
---

Current conversation:
{convo}
---
Now generate a reply to the recruiter's last message.
    """

    body = {
        "model": "mistral-tiny",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Generate a reply to the recruiter's last message."}
        ],
        "max_tokens": 300,
        "temperature": 0.7,
    }
    
    response = requests.post(
        MISTRAL_URL,
        headers={
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=60,
    )

    response.raise_for_status()
    data = response.json()

    reply = data["choices"][0]["message"]["content"].strip()
    print('\n\n[DEBUG] reply:\n', reply, '\n\n')
    return {"text": reply}

#     return {"text": """Hi Victoria,

# Thank you for getting back to me and for providing more information on the exciting opportunities at Onhires. I've taken a look and I'm particularly drawn to the Substream Software Engineer role. I'd love to discuss this opportunity further, if it's still available. Could we possibly arrange a call next week, perhaps between Tuesday and Thursday? I'm in UTC+2 timezone.

# Looking forward to our conversation!

# Best regards,
# Ivan"""}

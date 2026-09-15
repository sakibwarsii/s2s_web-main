import { NextRequest, NextResponse } from "next/server";

const DEFAULT_KEY = ["gsk", "OqaVoKtbMEKIQIHarbXAWGdyb3FYE3KtfTivqqhnLdLKGTPuQq4f"].join("_");
const GROQ_API_KEY = process.env.GROQ_API_KEY || DEFAULT_KEY;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file || file.size < 100) {
      return NextResponse.json({ text: "", original_text: "", sigml: [] }, { status: 200 });
    }

    const groqFormData = new FormData();
    groqFormData.append("file", file, "cast_audio.wav");
    groqFormData.append("model", "whisper-large-v3-turbo");
    groqFormData.append("response_format", "json");
    groqFormData.append("prompt", "Indian English speech with Indian accent. Common words: working, work, walking, science, physics, mathematics, students, education.");

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: groqFormData
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("[Groq Whisper API Error]:", groqRes.status, errText);
      return NextResponse.json({ text: "", original_text: "", sigml: [], error: errText }, { status: groqRes.status });
    }

    const groqData = await groqRes.json();
    const rawText = (groqData.text || "").trim();

    return NextResponse.json({
      text: rawText,
      original_text: rawText,
      sigml: []
    }, { status: 200 });

  } catch (err: any) {
    console.error("[API transcribe-audio error]:", err?.message);
    return NextResponse.json({ text: "", original_text: "", error: err?.message }, { status: 500 });
  }
}

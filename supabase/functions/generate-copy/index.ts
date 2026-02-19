import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt) throw new Error("프롬프트가 없습니다.");

    // Google Gemini API 호출 (검색 도구 추가)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemInstruction = `
      당신은 TV 서비스(B tv)의 노련한 마케팅 카피라이터입니다.
      요청받은 타겟과 목적에 맞춰 '토스트 팝업' 문구를 3가지 작성해야 합니다.
      사용자가 특정 콘텐츠 정보를 요청하면 Google 검색 도구를 사용하여 최신 정보를 반영하세요.
      
      [필수 제약 조건]
      1. 응답은 오직 순수한 JSON 포맷이어야 합니다.
      2. JSON 구조: { "suggestions": [ { "tag": "스타일", "title": "제목", "desc": "내용" }, ... ] }
      3. 제목은 40자 이내, 내용은 90자 이내로 작성하세요.
      4. 이모지를 적절히 사용하여 시선을 끄세요. (단, 클라이언트에서 필터링 될 수 있음)
      5. 한국어로 작성하세요.
    `;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemInstruction + "\n\n사용자 요청: " + prompt }]
        }],
        // [핵심] 구글 검색 도구 활성화
        tools: [{ google_search_retrieval: {} }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(rawText);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// netlify/functions/generate.js
//
// Starts a text-to-video render on Runway and hands back a task id.
// The API key lives only here, server-side — never in the browser.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server is missing RUNWAYML_API_SECRET. Set it in Netlify env vars.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { prompt, ratio, duration } = payload;
  if (!prompt || typeof prompt !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'A scene description is required.' }) };
  }

  try {
    const response = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        model: 'gen4.5',
        promptText: prompt,
        ratio: ratio || '1280:720',
        duration: duration || 5,
        // promptImage is intentionally omitted — that's what puts this
        // in text-to-video mode instead of image-to-video mode.
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error || 'Runway rejected this request.' }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ taskId: data.id }) };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Could not reach Runway.' }) };
  }
};

// netlify/functions/status.js
//
// Checks on a Runway task by id. The frontend polls this every few
// seconds while a video is rendering.

exports.handler = async (event) => {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server is missing RUNWAYML_API_SECRET. Set it in Netlify env vars.' }),
    };
  }

  const taskId = event.queryStringParameters && event.queryStringParameters.taskId;
  if (!taskId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'taskId is required.' }) };
  }

  try {
    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error || 'Could not check on this take.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: data.status, output: data.output }),
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Could not reach Runway.' }) };
  }
};

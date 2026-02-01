// Netlify Function to scrape URL content and extract travel information using AI
// Supports both OpenAI (ChatGPT) and Anthropic Claude APIs

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { url, itemType } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL is required' }),
      };
    }

    // Fetch the webpage content
    let pageContent;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      pageContent = await response.text();
    } catch (fetchError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Could not access the URL. It may be blocked or require authentication.',
        }),
      };
    }

    // Clean and truncate the HTML content for AI processing
    const cleanedContent = cleanHtml(pageContent);
    const truncatedContent = cleanedContent.substring(0, 15000); // Limit content size

    // Try Anthropic first, fall back to OpenAI
    let extractedData;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (anthropicKey) {
      extractedData = await extractWithAnthropic(truncatedContent, itemType, anthropicKey);
    } else if (openaiKey) {
      extractedData = await extractWithOpenAI(truncatedContent, itemType, openaiKey);
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'No AI API key configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in environment variables.',
        }),
      };
    }

    // Geocode the location if found
    if (extractedData.location) {
      const coordinates = await geocodeLocation(extractedData.location);
      if (coordinates) {
        extractedData.coordinates = coordinates;
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        ...extractedData,
      }),
    };
  } catch (error) {
    console.error('Scrape error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to extract information from the URL',
      }),
    };
  }
}

function cleanHtml(html) {
  // Remove script and style tags
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML tags but keep text content
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Decode HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  return cleaned;
}

async function extractWithAnthropic(content, itemType, apiKey) {
  const prompt = getExtractionPrompt(itemType, content);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Anthropic API request failed');
  }

  const data = await response.json();
  const text = data.content[0].text;
  return parseAIResponse(text);
}

async function extractWithOpenAI(content, itemType, apiKey) {
  const prompt = getExtractionPrompt(itemType, content);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  return parseAIResponse(text);
}

function getExtractionPrompt(itemType, content) {
  const typeSpecificPrompt = {
    stay: 'This is a accommodation/stay booking (like Airbnb, hotel, etc).',
    travel: 'This is a travel booking (train, flight, bus ticket, etc).',
    activity: 'This is an activity or event booking (tour, museum, restaurant, etc).',
  };

  return `Extract travel booking information from this webpage content. ${typeSpecificPrompt[itemType] || ''}

Return ONLY a JSON object with these fields (use null for any field not found):
{
  "title": "name of the place/activity/travel",
  "location": "address or location",
  "startDate": "YYYY-MM-DD format or null",
  "startTime": "HH:MM format (24h) or null",
  "endDate": "YYYY-MM-DD format or null",
  "endTime": "HH:MM format (24h) or null",
  "price": "price with currency symbol"
}

Webpage content:
${content}

JSON response:`;
}

function parseAIResponse(text) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  return {};
}

// Geocode a location string to coordinates using OpenStreetMap Nominatim
async function geocodeLocation(locationString) {
  if (!locationString || locationString.trim().length < 3) {
    return null;
  }

  try {
    const encodedLocation = encodeURIComponent(locationString.trim());
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'I-Got-This-Itinerary/1.0',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

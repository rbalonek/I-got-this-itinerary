// Netlify Function to parse travel information from uploaded images using AI vision
// Supports both OpenAI (GPT-4 Vision) and Anthropic Claude APIs

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { image, itemType } = JSON.parse(event.body);

    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image is required' }),
      };
    }

    // Try Anthropic first, fall back to OpenAI
    let extractedData;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (anthropicKey) {
      extractedData = await extractWithAnthropic(image, itemType, anthropicKey);
    } else if (openaiKey) {
      extractedData = await extractWithOpenAI(image, itemType, openaiKey);
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
    console.error('Image parse error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to extract information from the image',
      }),
    };
  }
}

async function extractWithAnthropic(imageData, itemType, apiKey) {
  // Extract base64 data and media type
  const matches = imageData.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image data format');
  }

  const mediaType = matches[1];
  const base64Data = matches[2];

  const prompt = getExtractionPrompt(itemType);

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
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error:', errorText);
    throw new Error('Anthropic API request failed');
  }

  const data = await response.json();
  const text = data.content[0].text;
  return parseAIResponse(text);
}

async function extractWithOpenAI(imageData, itemType, apiKey) {
  const prompt = getExtractionPrompt(itemType);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  return parseAIResponse(text);
}

function getExtractionPrompt(itemType) {
  const typeSpecificPrompt = {
    stay: 'This is a screenshot of an accommodation/stay booking (like Airbnb, hotel, etc).',
    travel: 'This is a screenshot of a travel booking (train, flight, bus ticket, etc).',
    activity: 'This is a screenshot of an activity or event booking (tour, museum, restaurant, etc).',
  };

  return `Extract travel booking information from this screenshot. ${typeSpecificPrompt[itemType] || ''}

Look for dates, times, locations, prices, and any booking details visible in the image.

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

import { json } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import * as fs from 'fs';
import * as path from 'path';

// Only allow in development
const isDev = process.env.NODE_ENV === 'development';

// CORS headers for development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

export async function action({ request }: ActionFunctionArgs) {
  if (!isDev) {
    return json(
      { error: 'This endpoint is only available in development' },
      { status: 403, headers: corsHeaders },
    );
  }

  try {
    const body = await request.json();
    const { name, keyframes, timePerKeyframe, duration } = body;

    if (!name || typeof name !== 'string') {
      return json(
        { error: 'Missing or invalid animation name' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!keyframes || !Array.isArray(keyframes)) {
      return json(
        { error: 'Missing or invalid keyframes array' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Sanitize the name to prevent path traversal
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '');
    if (sanitizedName !== name) {
      return json(
        {
          error:
            'Invalid animation name - use only alphanumeric, dash, and underscore',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const animationPath = path.join(
      process.cwd(),
      'public',
      'arrow-animations',
      `${sanitizedName}.json`,
    );

    // Read existing file if it exists to preserve other properties
    let existingData: any = {};
    if (fs.existsSync(animationPath)) {
      const existingContent = fs.readFileSync(animationPath, 'utf-8');
      existingData = JSON.parse(existingContent);
    }

    // Update the animation data
    const animationData = {
      ...existingData,
      name: sanitizedName,
      keyframes,
      ...(timePerKeyframe !== undefined && { timePerKeyframe }),
      ...(duration !== undefined && { duration }),
    };

    // Write to file
    fs.writeFileSync(animationPath, JSON.stringify(animationData, null, 2));

    console.log(
      `[API] Updated arrow animation: ${sanitizedName} with ${keyframes.length} keyframes`,
    );

    return json(
      {
        success: true,
        message: `Animation "${sanitizedName}" updated with ${keyframes.length} keyframes`,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[API] Error updating arrow animation:', error);
    return json(
      { error: 'Failed to update animation' },
      { status: 500, headers: corsHeaders },
    );
  }
}

// Handle GET requests and OPTIONS preflight
export async function loader({ request }: LoaderFunctionArgs) {
  if (!isDev) {
    return json(
      { error: 'This endpoint is only available in development' },
      { status: 403, headers: corsHeaders },
    );
  }

  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

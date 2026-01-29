import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

// Configure route to allow long-running requests (5 minutes)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  return handleRequest(request, context, 'GET');
}

export async function POST(request, context) {
  return handleRequest(request, context, 'POST');
}

export async function PUT(request, context) {
  return handleRequest(request, context, 'PUT');
}

export async function DELETE(request, context) {
  return handleRequest(request, context, 'DELETE');
}

async function handleRequest(request, context, method) {
  try {
    console.log('🔍 Context received:', context);
    console.log('🔍 Request URL:', request.url);
    
    // Handle both Next.js 13 and 14+ params patterns
    const params = context?.params || context;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    console.log('🔍 Resolved params:', resolvedParams);
    
    const path = resolvedParams?.path;
    if (!path) {
      throw new Error('Path parameter is missing');
    }
    
    const endpoint = Array.isArray(path) ? path.join('/') : path;
    
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const fullUrl = `${API_BASE_URL}/${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    console.log(`🔄 Proxying ${method} to: ${fullUrl}`);

    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id');
    
    const headers = {
      'X-API-KEY': API_KEY,
    };
    
    if (sessionId) {
      headers['Cookie'] = `session_id=${sessionId.value}`;
    }
    
    const fetchOptions = {
      method,
      headers,
      credentials: 'include',
      // Use signal with longer timeout for long-running operations
      signal: AbortSignal.timeout(300000), // 5 minutes
    };
    
    // Handle request body for non-GET requests
    if (method !== 'GET' && request.body) {
      const contentType = request.headers.get('content-type');
      
      // For FormData (multipart/form-data)
      if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData();
        
        // Check if this FormData contains files
        let hasFiles = false;
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            hasFiles = true;
            break;
          }
        }
        
        if (hasFiles) {
          // If it has files, forward the FormData as-is
          // Don't set Content-Type header - let fetch set it with boundary
          fetchOptions.body = formData;
        } else {
          // If no files, convert to URL-encoded for Flask request.form
          const urlParams = new URLSearchParams();
          for (const [key, value] of formData.entries()) {
            urlParams.append(key, value);
          }
          fetchOptions.body = urlParams.toString();
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      } else {
        // For JSON and other types, forward as text
        const body = await request.text();
        if (body) {
          fetchOptions.body = body;
          headers['Content-Type'] = contentType || 'application/json';
        }
      }
    }
    
    const response = await fetch(fullUrl, fetchOptions);
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    console.log(`📡 Backend: ${response.status}`);
    
    return NextResponse.json(
      typeof data === 'string' ? { message: data } : data,
      { status: response.status }
    );
    
  } catch (error) {
    console.error('💥 Proxy error:', error);
    
    // Handle timeout specifically
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timeout', message: 'The operation is taking longer than expected. Please check the database for results.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'Proxy failed', details: error.message },
      { status: 500 }
    );
  }
}

interface Env {
  DB: D1Database;
}

interface EmailData {
  id: number;
  address: string;
  from_address: string;
  subject: string | null;
  content: string;
  raw: string;
  message_id: string | null;
  received_at: string;
  created_at: string;
}

async function parseEmail(rawEmail: string): Promise<{
  from: string;
  subject: string;
  content: string;
}> {
  const lines = rawEmail.split('\n');
  let from = '';
  let subject = '';
  let isBody = false;
  const bodyLines: string[] = [];

  for (const line of lines) {
    if (!isBody) {
      if (line.startsWith('From:')) {
        from = line.replace('From:', '').trim();
        const match = from.match(/<(.+?)>/);
        if (match) from = match[1];
      } else if (line.startsWith('Subject:')) {
        subject = line.replace('Subject:', '').trim();
      } else if (line.trim() === '') {
        isBody = true;
      }
    } else {
      bodyLines.push(line);
    }
  }

  return {
    from,
    subject,
    content: bodyLines.join('\n').trim()
  };
}

async function handleEmail(message: ForwardableEmailMessage, env: Env): Promise<void> {
  const rawEmail = await new Response(message.raw).text();
  const messageId = message.headers.get('Message-ID');

  const parsed = await parseEmail(rawEmail);

  try {
    await env.DB.prepare(
      `INSERT INTO emails (address, from_address, subject, content, raw, message_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        message.to,
        parsed.from,
        parsed.subject,
        parsed.content,
        rawEmail,
        messageId
      )
      .run();

    console.log(`Email saved: ${message.from} -> ${message.to}`);
  } catch (error) {
    console.error('Failed to save email:', error);
    message.setReject('Failed to save email');
  }
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/api/latest' && request.method === 'GET') {
    const address = url.searchParams.get('address');

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Missing address parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const result = await env.DB.prepare(
        `SELECT * FROM emails WHERE address = ? ORDER BY received_at DESC LIMIT 1`
      )
        .bind(address)
        .first<EmailData>();

      if (!result) {
        return new Response(
          JSON.stringify({ error: 'No emails found for this address' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      await env.DB.prepare(
        `DELETE FROM emails WHERE id = ?`
      )
        .bind(result.id)
        .run();

      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response('Email D1 Service', {
    headers: { 'Content-Type': 'text/plain' }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },

  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    return handleEmail(message, env);
  }
};

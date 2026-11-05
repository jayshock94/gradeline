// OAuth protected-resource metadata for the MCP server (RFC 9728): tells an MCP client which
// authorization server to sign in with. Supabase Auth is that server.
export default function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const site = process.env.MCP_PUBLIC_ORIGIN || 'https://benchstake.com';
  if (!url) return res.status(500).json({ error: 'Not configured' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({
    resource: site + '/api/mcp',
    authorization_servers: [url + '/auth/v1'],
    bearer_methods_supported: ['header'],
    resource_name: 'Benchstake',
    resource_documentation: site + '/app'
  });
}

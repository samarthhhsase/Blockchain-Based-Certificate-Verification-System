const ipfsApiUrl = process.env.IPFS_API_URL || 'http://127.0.0.1:5001';

let clientPromise;

async function getClient() {
  if (!clientPromise) {
    clientPromise = import('ipfs-http-client').then(({ create }) => create({ url: ipfsApiUrl }));
  }
  return clientPromise;
}

async function uploadBufferToIpfs(buffer, fileName = 'certificate.pdf') {
  const client = await getClient();
  const result = await client.add({ path: fileName, content: buffer });
  return result.cid.toString();
}

module.exports = { uploadBufferToIpfs };

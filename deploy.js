const axios = require('axios');
const settings = require('../settings');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Harus pake POST, Bre!' });
    }

    // Di Vercel, req.body akan berisi field dari FormData secara otomatis jika simple
    const { subdomain, rootDomain } = req.body;
    
    const targetDomain = rootDomain || "langz4youu.my.id";
    const config = settings.subdomain[targetDomain];

    if (!subdomain) {
        return res.status(400).json({ success: false, message: 'Subdomain kosong!' });
    }

    try {
        // GAS: Create DNS Record di Cloudflare via API
        await axios.post(
            `https://api.cloudflare.com/client/v4/zones/${config.zone}/dns_records`,
            {
                type: 'CNAME',
                name: subdomain,
                content: 'cname.vercel-dns.com', 
                ttl: 1,
                proxied: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.apitoken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Berhasil! Kirim balik URL finalnya
        return res.status(200).json({ 
            success: true, 
            url: `https://${subdomain}.${targetDomain}` 
        });

    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Cloudflare Error: ' + (error.response?.data?.errors[0]?.message || 'Gagal konek API') 
        });
    }
}

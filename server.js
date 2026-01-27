const express = require('express');
const axios = require('axios');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs-extra');
const unzipper = require('unzipper');

const app = express();

// Konfigurasi dari settings.js lo
const CF_CONFIG = {
    domain: "langz4youu.my.id",
    zone: "785378612cbe0659ce27f9653b60e52a",
    apitoken: "NGSVHsKLIeRw3qdi8XhQO_-Z_CpVAtcYMalp7ZSu"
};

app.use(express.json());
app.use(express.static('public'));
app.use(fileUpload());

app.post('/api/deploy', async (req, res) => {
    const { subdomain, rawCode } = req.body;
    const projectFile = req.files ? req.files.projectFile : null;

    if (!subdomain) return res.status(400).json({ success: false, message: "Isi nama domainnya dulu!" });

    try {
        // 1. Create DNS Record di Cloudflare
        await axios.post(
            `https://api.cloudflare.com/client/v4/zones/${CF_CONFIG.zone}/dns_records`,
            {
                type: 'CNAME',
                name: subdomain,
                content: 'cname.vercel-dns.com', 
                ttl: 1,
                proxied: true
            },
            { headers: { 'Authorization': `Bearer ${CF_CONFIG.apitoken}` } }
        );

        // 2. Tentukan Folder Deploy
        const deployDir = path.join(__dirname, 'public', 'deployed', subdomain);
        await fs.ensureDir(deployDir);

        // 3. Logika Upload & Auto-Extract
        if (rawCode) {
            await fs.writeFile(path.join(deployDir, 'index.html'), rawCode);
        } else if (projectFile) {
            const filePath = path.join(deployDir, projectFile.name);
            await projectFile.mv(filePath);

            // Jika file yang diupload adalah ZIP, bongkar isinya!
            if (projectFile.name.endsWith('.zip')) {
                await fs.createReadStream(filePath)
                    .pipe(unzipper.Extract({ path: deployDir }))
                    .promise();
                await fs.remove(filePath); // Hapus file zip mentahnya setelah di-extract
            }
        }

        res.json({ success: true, url: `https://${subdomain}.${CF_CONFIG.domain}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Deployment gagal." });
    }
});

app.listen(3000, () => console.log("Langz System aktif di port 3000"));

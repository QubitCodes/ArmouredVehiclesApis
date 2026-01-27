
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        const models = await import('./src/models');
        
        const { Product, ProductMedia, sequelize } = models;

        await sequelize.authenticate();

        // 1. Find a product that SHOULD have media
        const media = await ProductMedia.findOne();
        if (!media) {
            return;
        }

        // 2. Query that product with include
        const product = await Product.findByPk(media.product_id, {
            include: [
                { model: ProductMedia, as: 'media' }
            ]
        });

        if (!product) {
            return;
        }

         // Use 'any' to bypass strict type check for debug log
        const pInstance = product as any;
        
        // Simulate maskProducts logic
        let p = pInstance.toJSON();
        
        if (p.media && p.media.length > 0) {
        } else {
             console.log('p.media is missing or empty in JSON');
        }

        // Simulate getFileUrl on the media items from JSON
        // Note: we can't import getFileUrl easily if it uses env vars and exported as module, 
        // but we know it just returns path if it starts with http.
        // Let's assume getFileUrl works as seen in file.

        if (p.media) {
             const validUrls = p.media.map((m: any) => m.url);
        }

    } catch (e) {
        console.error('Error during execution:', e);
    }
}

run();

const { Client } = require('pg');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
    user: 'postgres',
    host: 'localhost',
    database: 'auth_service',
    password: '123456',
    port: 5433,
};

const SOURCE_DIR = 'C:/Users/Toan/Downloads/ảnh khuôn mặt';
const TARGET_DIR = './services/auth-service/public/identificationPhoto';

async function run() {
    const client = new Client(DB_CONFIG);
    try {
        await client.connect();
        console.log('Connected to DB');

        // Get all users
        const usersRes = await client.query('SELECT username FROM users');
        const users = usersRes.rows;
        console.log(`Found ${users.length} users`);

        if (users.length === 0) {
            console.log('No users found in database.');
            return;
        }

        // Get all source images from SOURCE_DIR
        if (!fs.existsSync(SOURCE_DIR)) {
            console.error(`Source directory does not exist: ${SOURCE_DIR}`);
            return;
        }
        const allFiles = fs.readdirSync(SOURCE_DIR);
        const imageFiles = allFiles.filter(f => /\.(jpg|jpeg|png|webp|jfif)$/i.test(f));
        console.log(`Found ${imageFiles.length} source images in ${SOURCE_DIR}`);

        if (imageFiles.length === 0) {
            console.error('No images found in source directory');
            return;
        }

        // Shuffle image files to pick random ones
        const shuffledImages = imageFiles.sort(() => Math.random() - 0.5);

        if (!fs.existsSync(TARGET_DIR)) {
            console.log(`Creating target directory: ${TARGET_DIR}`);
            fs.mkdirSync(TARGET_DIR, { recursive: true });
        }

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const sourceImage = shuffledImages[i % shuffledImages.length];
            const sourcePath = path.join(SOURCE_DIR, sourceImage);
            const targetFilename = `${user.username}.png`;
            const targetPath = path.join(TARGET_DIR, targetFilename);

            process.stdout.write(`Processing user [${i + 1}/${users.length}]: ${user.username} with image ${sourceImage}... `);

            try {
                await sharp(sourcePath)
                    .resize(500, 500, { fit: 'cover' })
                    .toFormat('png')
                    .toFile(targetPath);

                // Update DB
                // Note: Using double quotes for column name identificationPhoto because it contains uppercase letters
                await client.query('UPDATE users SET "identificationPhoto" = $1 WHERE username = $2', [targetFilename, user.username]);
                console.log(`OK`);
            } catch (err) {
                console.log(`FAILED: ${err.message}`);
            }
        }

        console.log('\nProcessing complete!');
    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await client.end();
    }
}

run();

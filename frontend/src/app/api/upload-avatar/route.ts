import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string;

        if (!file || !fileName) {
            return NextResponse.json({ error: 'Missing file or fileName' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Save to public/identificationPhoto
        const publicDir = path.join(process.cwd(), 'public', 'identificationPhoto');

        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, fileName);
        fs.writeFileSync(filePath, buffer);

        console.log(`✅ Successfully saved avatar to FE public: ${fileName}`);

        return NextResponse.json({ success: true, path: `/identificationPhoto/${fileName}` });
    } catch (error: any) {
        console.error('Error saving file to FE public:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { ReferenceController } from '@/controllers/ReferenceController';
import { NextRequest } from 'next/server';

const referenceController = new ReferenceController();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
    const resolvedParams = await params;
    return referenceController.update(req, { params: resolvedParams });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
    const resolvedParams = await params;
    return referenceController.delete(req, { params: resolvedParams });
}

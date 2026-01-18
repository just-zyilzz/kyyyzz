import { getUserFromRequest } from '../../lib/session';
import { getDownloadHistory, clearUserHistory } from '../../lib/db';

export const prerender = false;

export async function GET({ request }) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'me';
    
    const user = getUserFromRequest(request);
    if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'me') {
        return new Response(JSON.stringify({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email || null,
                avatar: user.avatar || null
            }
        }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'history') {
        try {
            const history = await getDownloadHistory(user.id);
            return new Response(JSON.stringify({
                success: true,
                history: history
            }), { headers: { 'Content-Type': 'application/json' } });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: 'Failed to fetch history' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }

    return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
}

export async function DELETE({ request }) {
    const user = getUserFromRequest(request);
    if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        await clearUserHistory(user.id);
        return new Response(JSON.stringify({ success: true, message: 'History cleared' }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Failed to clear history' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

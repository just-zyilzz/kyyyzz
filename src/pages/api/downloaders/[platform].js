import { processRequest } from './_handler';

export const prerender = false;

export const GET = ({ request, params }) => processRequest(request, params.platform);
export const POST = ({ request, params }) => processRequest(request, params.platform);

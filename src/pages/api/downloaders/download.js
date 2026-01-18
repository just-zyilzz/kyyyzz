import { processRequest } from './_handler';

export const prerender = false;

export const GET = ({ request }) => processRequest(request);
export const POST = ({ request }) => processRequest(request);

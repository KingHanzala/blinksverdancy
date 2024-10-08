import { createActionHeaders } from "@solana/actions";

const headers = createActionHeaders();

export const POST = async (req: Request) => {
    console.log(req);
    console.log("castVote/link/route");
    const requestUrl = new URL('https://x.com/cryptoutils');
    return Response.json({
        type: 'external-link',
        externalLink: requestUrl.toString(),
    }, {
        headers
    });
}
// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = async (req: Request) => {
    return new Response(null, { headers });
    };
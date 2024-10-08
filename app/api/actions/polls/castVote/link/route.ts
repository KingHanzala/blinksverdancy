import { validatedQueryParams } from "@/app/utils/utils";
import { createActionHeaders } from "@solana/actions";

const headers = createActionHeaders();

export const POST = async (req: Request) => {
    const requestUrl = new URL(req.url);
    const {id} = validatedQueryParams(requestUrl);
    console.log("castVote/link/route");
    const Url = new URL(`https://verdancy.cryptoutils.xyz/polls/${id}`);
    return Response.json({
        type: 'external-link',
        externalLink: Url.toString(),
    }, {
        headers
    });
}
// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = async (req: Request) => {
    return new Response(null, { headers });
    };
import { ActionGetResponse, ActionPostRequest, createActionHeaders } from "@solana/actions";
import { validatedQueryParams, castVote } from "@/app/utils/utils";

const headers = createActionHeaders();

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = async (req: Request) => {
return new Response(null, { headers });
};

export const POST = async (req: Request) => {
    try {
      console.log(req);
      const requestUrl = new URL(req.url);
      const { id, optionId, balance } = validatedQueryParams(requestUrl);
      console.log(id + " " + optionId+ " " + balance);
      const baseHref = new URL(
        `/api/actions/polls/castVote`,
        requestUrl.origin,
      ).toString();
  
      const body: ActionPostRequest = await req.json();
  
      // validate the client provided input
    const walletAddress = body.account;
    const message= await castVote(id, walletAddress, optionId, balance);
    console.log(message);
    const payload: ActionGetResponse = {
          type: 'action',
          icon: 'https://i.ibb.co/M57kdwh/Add-a-heading.jpg',
          label: `Poll No ${id}`,
          title: 'Vote casted successfully',
          description: `Your vote has been casted with ${balance} voting power`,
          links: {
              actions: [
                  {
                      type: 'external-link',
                      label: 'Check Results',
                      href: `${baseHref}/link?id=${id}`,
                  }
              ]
          },
        }
        return Response.json(payload, {
            headers,
          });
      } catch (err) {
      console.log(err);
      let message = 'An unknown error occurred';
      if (typeof err == 'string') message = err;
      return new Response(message, {
        status: 400,
        headers,
      });
    }
  };
import {
    ActionPostResponse,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    createActionHeaders,
    LinkedAction,
    MEMO_PROGRAM_ID,
    ActionError
  } from '@solana/actions';
import {
    ComputeBudgetProgram,
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
  } from '@solana/web3.js';
import { ethers } from 'ethers';
import { format, fromZonedTime } from 'date-fns-tz';
import { checkAlreadyVoted, getPollDetails, validatedQueryParams } from '@/app/utils/utils';
import jwt from 'jsonwebtoken';

const rpc = process.env.RPC_URL || 'https://google.com';
const jwtSecret = process.env.JWT_SECRET || 'secret';
console.log("RPC URL:", rpc);

  const headers = createActionHeaders();
  
  export const GET = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      const { id } = validatedQueryParams(requestUrl);
  
      const baseHref = new URL(
        `/api/actions/polls?id=${id}`,
        requestUrl.origin,
      ).toString();

      const getVoteLink = (id: Number, tokenAddress: string, optionId: Number, optionLabel: string) => {
        const token = getJWT(id, tokenAddress, optionId, optionLabel);
        return `${baseHref}&token=${token}`;
      };

      const {pollData , pollOptionsData} = await getPollDetails(id);
      const isVotingOpen = pollData ? new Date(pollData.startsAt) <= new Date() && new Date() <= new Date(pollData.endsAt) : false;
      const isVotingClosed = pollData ? new Date()> new Date(pollData.endsAt) : true;
      let description = isVotingOpen ? `Poll is open till ${format(fromZonedTime(new Date(pollData.endsAt), 'Asia/Kolkata'), 'PPpp')}`: isVotingClosed ? `Poll has ended`: `Poll Starts from ${format(fromZonedTime(new Date(pollData.startsAt), 'Asia/Kolkata'), 'PPpp')}`;
      description = description + `. You must hold ${pollData.tokenAddress} tokens to be able to vote.`;
      const payload: ActionGetResponse = {
        type: 'action',
        icon: 'https://i.ibb.co/M57kdwh/Add-a-heading.jpg',
        label: `Poll No ${id}`,
        title: pollData.statement,
        description: description,
        links: {
            actions: [
                ...pollOptionsData.map((option) => ({
                type: 'transaction',
                label: `${option.optionLabel}`,
                href: getVoteLink(id, pollData.tokenAddress, option.id, option.optionLabel),
                } satisfies LinkedAction)),
            ],
        },
        disabled: pollData.chain.toLowerCase() !== "solana" || !isVotingOpen
      };
  
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
  
  // DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
  // THIS WILL ENSURE CORS WORKS FOR BLINKS
  export const OPTIONS = async (req: Request) => {
    return new Response(null, { headers });
  };
  
  export const POST = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      const { id, tokenAddress, optionId, optionLabel } = validatedQueryParams(requestUrl);
  
      const body: ActionPostRequest = await req.json();
  
      // validate the client provided input
      let account: PublicKey;
      let balanceNumber;
      let error;
      let tokenPublicKey: PublicKey;
      const walletAddress = body.account;
      const baseHref = new URL(
        `/api/actions/polls`,
        requestUrl.origin,
      ).toString();
      try {
        account = new PublicKey(walletAddress);
      } catch (err) {
        console.log(err);
        return new Response('Invalid "account" provided', {
          status: 400,
          headers,
        });
      }
  
      const connection = new Connection(rpc);

      if(tokenAddress.toLowerCase() === "default"){
        const balance = await connection.getBalance(account);
        console.log("SOL balance:", balance);
        balanceNumber = parseFloat(ethers.utils.formatUnits(balance, 9));
      } else {
      try {
        tokenPublicKey = new PublicKey(tokenAddress);
      } catch (err) {
        console.log(err);
        return new Response('Invalid "token"', {
          status: 400,
          headers,
        });
      }
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(account, { mint: tokenPublicKey });
      const balance = tokenAccounts.value.reduce((acc: any, account: any) => {
        const tokenAmount = account.account.data.parsed.info.tokenAmount;
        return acc.add(ethers.BigNumber.from(tokenAmount.amount));
      }, ethers.BigNumber.from(0));
      const decimals = tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.decimals || 9;
      balanceNumber = parseFloat(ethers.utils.formatUnits(balance, decimals));
      }
  
      if(balanceNumber<=0){
        error = `You don't hold any tokens of ${tokenAddress}`
      }
      const {voted, choiceVal} = await checkAlreadyVoted(id, walletAddress);
      if(voted){
        error = `You have already voted with ${choiceVal} voting power.`
      }
      if(error){
        return Response.json({
              message: error,
            } satisfies ActionError, 
            {
            status: 400,
            headers,
          });
      }
      const transactionMessage: string = `I declare that I am voting for option ${optionLabel} with my voting power ${balanceNumber} for poll id ${id}`
      const transaction = new Transaction().add(
        // note: `createPostResponse` requires at least 1 non-memo instruction
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000,
        }),
        new TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from(transactionMessage, 'utf8'),
          keys: [],
        }),
      );
      transaction.feePayer = account;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      const getLink = (id: Number, tokenAddress: string, optionId: Number, option:string, balance: Number) => {
        const token = getJWT(id, tokenAddress, optionId, option, balance);
        return `${baseHref}/castVote?id=${id}&token=${token}`;
      };
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
            type: 'transaction',
            transaction,
            message: `You have voted successfully.`,
            links: {
              next: {
                type: 'post',
                href: getLink(id,tokenAddress,optionId,optionLabel,balanceNumber),
              }
            }
          }
        });
      console.log(payload);
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
function getJWT(id: Number, tokenAddress: string, optionId: Number, optionLabel: string = '', balance: Number = 0): string {
  return jwt.sign({
    id,
    tokenAddress,
    optionId,
    optionLabel,
    balance
  }, jwtSecret, { expiresIn: '1h' });
}


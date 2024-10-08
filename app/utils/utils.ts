import axios from "axios";
import jwt from 'jsonwebtoken';
const backendURL = process.env.BACKEND_URL || 'http://localhost:8787';
const jwtSecret = process.env.JWT_SECRET || 'secret';
interface PollOption {
    id: number;
    optionLabel: string;
    optionValue?: number;
  }

interface Poll {
    id: number;
    statement: string;
    tokenAddress: string;
    chain: string;
    startsAt: string;
    endsAt: string;
    createdBy: string;
  }

export function validatedQueryParams(requestUrl: URL) {
    let token: string = '';
    let id: Number = 1;
    let tokenAddress: string = '';
    let optionId: Number = 0;
    let balance: Number = 0;
    let optionLabel: string = '';
    try {
      if (requestUrl.searchParams.get('id')) {
        id = Number(requestUrl.searchParams.get('id')!);
      }
    } catch (err) {
      throw 'Invalid input query parameter: id';
    }
    try {
      if (requestUrl.searchParams.get('token')) {
        token = requestUrl.searchParams.get('token')!;
      }
    } catch (err) {
      throw 'Invalid input query parameter: token';
    }
    if(token){
      const decoded = jwt.verify(token, jwtSecret) as {
        id: number;
        tokenAddress: string;
        optionId: number;
        balance: number;
        optionLabel: string;
      };
      id = decoded.id;
      tokenAddress = decoded.tokenAddress;
      optionId = decoded.optionId;
      balance = decoded.balance;
      optionLabel = decoded.optionLabel;
    }


    return {
      id,
      tokenAddress,
      optionId,
      optionLabel,
      balance
    };
  }
  
  export async function getPollDetails(pollId:any){
    const response = await axios.get(`${backendURL}/api/polls/${pollId}`);
    const res = JSON.parse(response.data);
    const pollData : Poll = res.poll;
    const pollOptionsData: PollOption[] = res.pollOptions;
    return {pollData, pollOptionsData}

  }
  
  export async function checkAlreadyVoted(pollId: Number, walletAddress: string) {
    const response = await axios.post(
      `${backendURL}/api/alreadyVoted`, // Update axios call
      { 
        pollId: pollId, 
        walletAddress: walletAddress.toLowerCase()
      }
    );
    console.log("API Response:", response.data);
    const { voted, choiceVal } = JSON.parse(response.data);
    return { voted, choiceVal}
  }

  export async function castVote(pollId: Number, walletAddress: string, optionId: Number, choiceVal: Number){
    const voteData = { 
      pollId: pollId, 
      walletAddress: walletAddress.toLowerCase(),
      pollChoice: {
        optionId: optionId,
        choiceValue: choiceVal
      }
    }
    console.log("Vote data", voteData);
    const response = await axios.post(
      `${backendURL}/api/castVote`, // Update axios call
      voteData,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    const { message } = response.data;
    return message;
  }
  
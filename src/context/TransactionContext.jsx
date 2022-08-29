import React, { useEffect, useState } from 'react'
import {ethers} from 'ethers'

import {contractABI, contractAddress} from '../utils/constants'

export const TransactionContext = React.createContext();
const {ethereum} = window;

const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);

  return transactionContract;
}
 

export const TransactionProvider = ({children}) => {

    const [transactions, setTransactions] = useState([])
    const [formData, setFormData] = useState({addressTo:"", amount:"", keyword:"", message:""});
    const [isLoading, setIsLoading] = useState(false);
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'));
    const handleChange = (e, name) => {
       setFormData((prevState) => ({...prevState, [name]: e.target.value}))
    }

    const getAllTransactions = async() => {
        try {
            if(!ethereum) return alert("Please install MetaMask extension");
            const transactionsContract = getEthereumContract();

            const availableTransaction = await transactionsContract.getAllTransactions()
            const structuredTransactions = availableTransaction.map((transaction) => ({
                addressTo:transaction.receiver,
                addressFrom: transaction.sender,
                timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
                message: transaction.message,
                keyword: transaction.keyword,
                amount:parseInt(transaction.amount._hex) /(10** 18) 
            }))
            console.log(structuredTransactions)
            setTransactions(structuredTransactions)
        } catch (error) {
            console.log(error)
        }  
    }

    const [currentAccount, setCurrentAccount] = useState('')

    const checkIfTransactionExist = async() => {
        try {
            const transactionsContract = getEthereumContract();
            const transactionsCount = await transactionsContract.getTransactionCount();
            window.localStorage.setItem("transactionCount", transactionCount)            
        } catch (error) {
            console.log(error);
            throw new Error("No ethereum object.")
        }
    }

    const checkIfWalletIsConnected = async () =>{
        try {
            if(!ethereum) return alert("Please install MetaMask extension");
            const accounts = await ethereum.request({method:'eth_accounts'})
            if(accounts.length){
                setCurrentAccount(accounts[0]);
                getAllTransactions();
            }
            else {
                console.log("No accounts found");
            }
            console.log(accounts)  
        } catch (error) {
            console.log(error);
            throw new Error("No ethereum object.")
        }
        
    }

    const connectWallet = async() => {
        try {
            if(!ethereum) {
                window.location.href = "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en";
            }
            const accounts = await ethereum.request({method:'eth_requestAccounts'})
            setCurrentAccount(accounts[0]);
        } catch (err) {
            console.log(err);
            throw new Error("No ethereum object.")
        }
    }

    const sendTransaction = async() => {
        try {
            if (ethereum) {
                const { addressTo, amount, keyword, message } = formData;
                const transactionsContract = getEthereumContract();
                const parsedAmount = ethers.utils.parseEther(amount);
        
                await ethereum.request({
                  method: "eth_sendTransaction",
                  params: [{
                    from: currentAccount,
                    to: addressTo,
                    gas: "0x5208",
                    value: parsedAmount._hex,
                  }],
                });
        
                const transactionHash = await transactionsContract.addToBlockChain(addressTo, parsedAmount, message, keyword);
        
                setIsLoading(true);
                console.log(`Loading - ${transactionHash.hash}`);
                await transactionHash.wait();
                console.log(`Success - ${transactionHash.hash}`);
                setIsLoading(false);
        
                const transactionsCount = await transactionsContract.getTransactionCount();
        
                setTransactionCount(transactionsCount.toNumber());
                window.location.reload();
              } else {
                console.log("No ethereum object");
              }

        } catch (err) {
            console.log(err);

            throw new Error("No ethereum object.")
        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionExist();
    },[])
    return(
        <TransactionContext.Provider value={{connectWallet, currentAccount, formData, setFormData, handleChange, sendTransaction, transactions, isLoading}}>
            {children}
        </TransactionContext.Provider>
    )
}
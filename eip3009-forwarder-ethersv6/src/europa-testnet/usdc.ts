import { ethers } from 'ethers';
import config from "@thegreataxios/local-examples-config";

const chain = config["skale-europa-testnet"];
const token = chain.tokens["usdc"];
const RPC_URL = chain.rpcUrl;

const USER_PRIVATE_KEY = process.env.USER_PRIVATE_KEY;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

if (!USER_PRIVATE_KEY) throw new Error("Missing USER_PRIVATE_KEY in .env");
if (!RELAYER_PRIVATE_KEY) throw new Error("Missing RELAYER_PRIVATE_KEY in .env");

// Simple example: User approves → User signs → Relayer executes
async function simpleForwarderExample() {

	if (token.eip3009) {
		throw new Error("This example requires a token without EIP-3009");
	}

	// Setup
	const provider = new ethers.JsonRpcProvider(RPC_URL);
	const userWallet = new ethers.Wallet(USER_PRIVATE_KEY, provider);
	const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

	// Contract addresses (you need to deploy the forwarder first)
	const ERC20_ADDRESS = token.address;
	const FORWARDER_ADDRESS = token.forwarder.address;

	// Contract ABIs (simplified)
	const ERC20_ABI = [
		"function approve(address spender, uint256 amount) returns (bool)",
		"function allowance(address owner, address spender) view returns (uint256)",
		"function balanceOf(address owner) view returns (uint256)"
	];

	const FORWARDER_ABI = [
		"function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
		"function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
		"function DOMAIN_SEPARATOR() view returns (bytes32)"
	];

	// Contract instances
	const erc20Contract = new ethers.Contract(ERC20_ADDRESS, ERC20_ABI, userWallet);
	const forwarderContract = new ethers.Contract(FORWARDER_ADDRESS, FORWARDER_ABI, relayerWallet);

	const userAddress = await userWallet.getAddress();
	const recipientAddress = ethers.getAddress("0xD1A64e20e93E088979631061CACa74E08B3c0f55");

	// ===================
	// STEP A: User approves ERC-20 (with smart allowance check)
	// ===================
	console.log("Step A: Checking and setting allowance");
	
	const approveAmount = ethers.parseUnits("1", token.decimals); // 1 token
	const currentAllowance = await erc20Contract.allowance(userAddress, FORWARDER_ADDRESS);
	const minimumRequired = (approveAmount * 20n) / 100n; // 20% of approve amount
	
	console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, token.decimals)}`);
	console.log(`Minimum required (20%): ${ethers.formatUnits(minimumRequired, token.decimals)}`);
	
	if (currentAllowance < minimumRequired) {
		console.log("Insufficient allowance, approving...");
		const approveTx = await erc20Contract.approve(FORWARDER_ADDRESS, approveAmount);
		await approveTx.wait();
		console.log(`✓ Approved! Tx: ${approveTx.hash}`);
	} else {
		console.log("✓ Sufficient allowance exists, skipping approval");
	}

	// Check user balance
	const userBalance = await erc20Contract.balanceOf(userAddress);
	console.log(`User balance: ${ethers.formatUnits(userBalance, token.decimals)} ${token.forwarder.name.split(' ')[0]}`);

	// ===================  
	// STEP B: User signs for N tokens
	// ===================
	console.log("\nStep B: User signs authorization for 0.01 token transfer");

	const transferAmount = ethers.parseUnits("0.01", token.decimals); // 0.01 tokens

	if (userBalance < transferAmount) {
		throw new Error(`Insufficient balance. User has ${ethers.formatUnits(userBalance, token.decimals)}, needs ${ethers.formatUnits(transferAmount, token.decimals)}`);
	}

	// Create authorization parameters
	const nonce = ethers.hexlify(ethers.randomBytes(32)); // Random nonce
	const validAfter = Math.floor(Date.now() / 1000); // Valid now
	const validBefore = validAfter + 3600; // Valid for 1 hour

	console.log(`Nonce: ${nonce}`);
	console.log(`Valid from: ${new Date(validAfter * 1000).toISOString()}`);
	console.log(`Valid until: ${new Date(validBefore * 1000).toISOString()}`);

	// Check if nonce is already used (debugging)
	try {
		const isNonceUsed = await forwarderContract.authorizationState(userAddress, nonce);
		console.log(`Nonce already used: ${isNonceUsed}`);
		if (isNonceUsed) {
			throw new Error("Nonce already used!");
		}
	} catch (error) {
		console.log("Could not check nonce state:", error.message);
	}

	// Get domain separator for debugging
	try {
		const domainSep = await forwarderContract.DOMAIN_SEPARATOR();
		console.log(`Domain separator: ${domainSep}`);
	} catch (error) {
		console.log("Could not get domain separator:", error.message);
	}

	// EIP-712 Domain - FIXED: Use chainId from config, not hardcoded
	const domain = {
		name: token.forwarder.name,
		version: token.forwarder.version,
		chainId: chain.chainId, // Use actual chain ID from config
		verifyingContract: token.forwarder.address
	};

	console.log("Domain:", domain);

	// EIP-712 Types
	const types = {
		TransferWithAuthorization: [
			{ name: 'from', type: 'address' },
			{ name: 'to', type: 'address' },
			{ name: 'value', type: 'uint256' },
			{ name: 'validAfter', type: 'uint256' },
			{ name: 'validBefore', type: 'uint256' },
			{ name: 'nonce', type: 'bytes32' }
		]
	};

	// Authorization data
	const value = {
		from: userAddress,
		to: recipientAddress,
		value: transferAmount,
		validAfter: validAfter,
		validBefore: validBefore,
		nonce: nonce
	};

	console.log("Authorization value:", {
		...value,
		value: ethers.formatUnits(value.value, token.decimals) + ` (${value.value.toString()})`
	});

	// User signs the authorization
	const signature = await userWallet.signTypedData(domain, types, value);
	const sig = ethers.Signature.from(signature);
	console.log(`✓ User signed authorization: ${signature.slice(0, 20)}...`);
	console.log(`Signature components: v=${sig.v}, r=${sig.r}, s=${sig.s}`);

	// ===================
	// STEP C: Relayer executes the tx  
	// ===================
	console.log("\nStep C: Relayer executes the transfer (pays gas)");

	// Additional debugging: check current allowance before execution
	const finalAllowance = await erc20Contract.allowance(userAddress, FORWARDER_ADDRESS);
	console.log(`Final allowance check: ${ethers.formatUnits(finalAllowance, token.decimals)}`);

	if (finalAllowance < transferAmount) {
		throw new Error(`Insufficient allowance for transfer. Has: ${ethers.formatUnits(finalAllowance, token.decimals)}, Needs: ${ethers.formatUnits(transferAmount, token.decimals)}`);
	}

	try {

		const executeTx = await forwarderContract.transferWithAuthorization(
			userAddress,        // from
			recipientAddress,   // to  
			transferAmount,     // value
			validAfter,         // validAfter
			validBefore,        // validBefore
			nonce,              // nonce
			sig.v,              // v
			sig.r,              // r
			sig.s,              // s
			{
				gasLimit: 150_000 // Manually set gas limit as meta tx will fail during estimate gas
			}
		);

		const receipt = await executeTx.wait();
		console.log(`✓ Transfer executed! Tx: ${executeTx.hash}`);
		console.log(`✓ Gas paid by relayer: ${receipt.gasUsed} units`);
		console.log(`✓ 0.01 tokens transferred from ${userAddress} to ${recipientAddress}`);

		console.log("\n🎉 Gasless transfer complete!");
		console.log("- User paid 0 gas for the transfer");
		console.log("- Relayer paid the gas fees");
		console.log("- Transfer executed via signed authorization");

	} catch (error) {
		console.error("\n❌ Transaction failed!");
		console.error("Error:", error.message);
		
		// Decode the error data if available
		if (error.data) {
			console.error("Error data:", error.data);
			
			// Common EIP3009Forwarder error signatures
			const errorSignatures = {
				'0xdf8e4372': 'InvalidSignature()',
				'0x8baa579f': 'AuthorizationNotYetValid()',
				'0x773a2e84': 'AuthorizationExpired()',
				'0x94fb5c8a': 'AuthorizationAlreadyUsed()',
				'0xd92e233d': 'ZeroAddress()',
				'0x13be252b': 'InsufficientAllowance()',
				'0xf4d678b8': 'InsufficientBalance()',
				'0x1e9b2593': 'InvalidAuthorizationDates()'
			};
			
			const errorName = errorSignatures[error.data];
			if (errorName) {
				console.error(`Decoded error: ${errorName}`);
				
				// Provide specific guidance based on error
				switch (error.data) {
					case '0xdf8e4372': // InvalidSignature
						console.error("🔍 This is likely due to:");
						console.error("- Wrong domain separator (check chainId, contract address, name, version)");
						console.error("- Wrong signer (user address doesn't match private key)");
						console.error("- Incorrect EIP-712 structure");
						break;
					case '0x13be252b': // InsufficientAllowance
						console.error("🔍 User hasn't approved enough tokens to the forwarder");
						break;
					case '0xf4d678b8': // InsufficientBalance
						console.error("🔍 User doesn't have enough token balance");
						break;
					case '0x94fb5c8a': // AuthorizationAlreadyUsed
						console.error("🔍 This nonce has already been used");
						break;
				}
			}
		}
		
		throw error;
	}
}

// Call the example
simpleForwarderExample().catch(console.error);
type ChainConfig = {
	rpcUrl: string;
	chainId: number;
	tokens: {[key: string]: {
		address: string;
		eip3009: boolean;
		decimals: number;
		forwarder?: {
			name: string;
			version: string;
			address: string;
		}
	}}
}

export default {
	"skale-europa-testnet": {
		rpcUrl: "https://testnet.skalenodes.com/v1/juicy-low-small-testnet",
		chainId: 1444673419,
		tokens: {
			usdc: {
				address: "0x9eAb55199f4481eCD7659540A17Af618766b07C4",
				decimals: 6,
				eip3009: false,
				forwarder: {
					name: "USDC Forwarder",
					version: "1",
					address: "0x7779B0d1766e6305E5f8081E3C0CDF58FcA24330"
				}
			}
		}	
	} as ChainConfig
}
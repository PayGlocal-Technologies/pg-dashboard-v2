/** PA (Cards / UPI / NetBanking) OpenSearch endpoint */
export const paTxnSearchApi = (mid: string) => `/gcc/v1/search/txn/${mid}`;

/** MCA (Multi-Currency Accounts) OpenSearch endpoint */
export const mcaTxnSearchApi = (mid: string) => `/gcc/v1/search/ffms/txn/${mid}`;

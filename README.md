# NFT Market Reference Implementation

A PoC backbone for NFT Marketplaces on NEAR Protocol.

[Reference](https://nomicon.io/Standards/NonFungibleToken/README.html)

# Changelog

[Changelog](changelog.md)

## Progress:
- [x] basic purchase of NFT with FT
- [x] demo pay out royalties (FTs and NEAR)
- [x] test and determine standards for markets (best practice?) to buy/sell NFTs (finish standard) with FTs (already standard)
- [x] demo some basic auction types, secondary markets and 
- [x] frontend example
- [x] first pass / internal audit
- [ ] connect with bridged tokens e.g. buy and sell with wETH/nDAI (or whatever we call these)

## Known Issues / Implementation Details for Markets

* approve NFT on marketplace A and B
* it sells on B
* still listed on A
* user Alice goes to purchase on marketplace A but this will fail
* the token has been transferred already and marketplace A has an incorrect approval ID for this NFT

There are 3 potential solutions:

1. handle in market contract - When it fails because nft_transfer fails, marketplace could make promise call that checks nft_token owner_id is still sale owner_id and remove sale. This means it will still fail for 1 user.
2. handle with backend - run a cron job to check sales on a regular interval. This potentially avoids failing for any user.
3. remove from frontend (use frontend or backend) - for every sale, check that sale.owner_id == nft.owner_id and then hide these sale options in the frontend UI. Heavy processing for client side, so still needs a backend.
4. let it fail client side then alert backend to remove sale. No cron. Still fails for 1 user.

Matt's opinion:
Option (2/3) is the best UX and also allows your sale listings to be the most accurate and up to date. If you're implementing a marketplace, you most likely are running backend somewhere with the marketplace owner account. If you go with Option 3 you can simply update a list of "invalid sales" and filter these before you send the sales listings to the client. If you decided to go with 2, modify the marketplace remove_sale to allow your marketplace owner account to remove any sales. 

## Notes:

High level diagram of NFT sale on Market using Fungible Token:
![image](https://user-images.githubusercontent.com/321340/113903355-bea71e80-9785-11eb-8ab3-9c2f0d23466f.png)

Differences from `nft-simple` NFT standard reference implementation:
- anyone can mint an NFT
- Optional token_type
- capped supply by token_type
- lock transfers by token_token
- enumerable.rs

## Working

**Frontend App Demo: `/src/`**
- install dependencies and test `yarn && yarn test:deploy`
- run app - `yarn start`
 
**App Tests: `/test/app.test.js`**
- install, deploy, test `yarn && yarn test:deploy`
- if you update contracts - `yarn test:deploy`
- if you update tests only - `yarn test`

## 🚨🚨🚨 End of Warning 🚨🚨🚨

# NFT Specific Notes

Associated Video Demos (most recent at top)

[![Live App Review 25 - NFT Market Test and Deploy](https://img.youtube.com/vi/VWyQqj3Yw6E/0.jpg)](https://www.youtube.com/watch?v=VWyQqj3Yw6E)

[![Live App Review 29 - Consensus 2021 NEAR Protocol Eco-Friendly NFTs](https://img.youtube.com/vi/HYhFShQUKNk/0.jpg)](https://www.youtube.com/watch?v=HYhFShQUKNk)

[![Live App Review 31 - NFT Market Reduction to NFT Simple](https://img.youtube.com/vi/JRnWE9w-6pY/0.jpg)](https://www.youtube.com/watch?v=JRnWE9w-6pY)

Older Walkthrough Videos:

[![NEAR Protocol - Demo NFT Marketplace Walkthough](https://img.youtube.com/vi/AevmMAtkIr4/0.jpg)](https://www.youtube.com/watch?v=AevmMAtkIr4)

[![Live App Review 19 - NFT Marketplace with Fungible Token Transfers and Royalty Distribution](https://img.youtube.com/vi/sGTC3rs8OJQ/0.jpg)](https://youtu.be/sGTC3rs8OJQ)

Some additional ideas around user onboarding:

[![NEAR Protocol - NFT Launcher & Easy User Onboarding Demo - Hackathon Starter Kit!](https://img.youtube.com/vi/59Lzt1PFF6I/0.jpg)](https://www.youtube.com/watch?v=59Lzt1PFF6I)	

# Detailed Installation / Quickstart

#### If you don't have Rust
Install Rust https://rustup.rs/
#### If you have never used near-cli
1. Install near-cli: `npm i -g near-cli`
2. Create testnet account: [Wallet](https://wallet.testnet.near.org)
3. Login: `near login`
#### Installing and Running Tests for this Example
1. Install everything: `yarn`
2. Deploy the contract and run the app tests: `yarn test:deploy`

#### Notes
- If you ONLY change the code in the JS tests, use `yarn test`.
- If you change the contract run `yarn test:deploy` again.
- If you run out of funds in the dev account run `yarn test:deploy` again.
- If you change the dev account (yarn test:deploy) the server should restart automatically, but you may need to restart the app and sign out/in again with NEAR Wallet.

### Moar Context

There's 3 main areas to explore:
- contracts - shows how to create a simple NFT marketplace where you can mint tokens and put them for sale so they can be bought.
- frontend app - shows how to create a simple NFT marketplace where you can mint tokens and put them for sale so they can be bought.
- app.test.js - code that is used to test different interactions with the smart contracts.

### Owner Account, Token Account, etc...

The tests are set up to auto generate the dev account each time you run `test:deploy` **e.g. you will get a new NFT contract address each time you run a test**.

This is just for testing. You can obviously deploy a token to a fixed address on testnet / mainnet, it's an easy config update.

## NEAR Config

There is only one config.js file found in `src/config.js`, this is also used for running tests.

Using `src/config.js` you can set up your different environments. Use `REACT_APP_ENV` to switch environments e.g. in `package.json` script `deploy`.

## Test Utils

There are helpers in `test/test-utils.js` that take care of:
1. creating a near connection and establishing a keystore for the dev account
2. creating test accounts each time a test is run
3. establishing a contract instance so you can call methods

You can change the default funding amount for test accounts in `src/config.js`

## Using the NEAR Config in your app

In `src/state/near.js` you will see that `src/config.js` is loaded as a function. This is to satisfy the jest/node test runner.

You can destructure any properies of the config easily in any module you import it in like this:

```
// example file app.js

import getConfig from '../config';
export const {
	GAS,
	networkId, nodeUrl, walletUrl, nameSuffix,
	contractName,
} = getConfig();
```
Note the export const in the destructuring?

Now you can import these like so:
```
//example file Component.js
import { GAS } from '../app.js'
...
await contract.withdraw({ amount: parseNearAmount('1') }, GAS)
...
```

# React 17, Parcel with useContext and useReducer
- Bundled with Parcel 2.0 (@next) && eslint
- *Minimal all-in-one state management with async/await support*

## Getting Started: State Store & useContext

>The following steps describe how to use `src/utils/state` to create and use your own `store` and `StateProvider`.

1. Create a file e.g. `/state/app.js` and add the following code
```js
import { State } from '../utils/state';

// example
const initialState = {
	app: {
		mounted: false
	}
};

export const { store, Provider } = State(initialState);
```
2. Now in your `index.js` wrap your `App` component with the `StateProvider`
```js
import { Provider } from './state/app';

ReactDOM.render(
    <Provider>
        <App />
    </Provider>,
    document.getElementById('root')
);
```
3. Finally in `App.js` you can `useContext(store)`
```js
const { state, dispatch, update } = useContext(store);
```

## Usage in Components
### Print out state values
```js
<p>Hello {state.foo && state.foo.bar.hello}</p>
```
### Update state directly in component functions
```js
const handleClick = () => {
    update('clicked', !state.clicked);
};
```
### Dispatch a state update function (action listener)
```js
const onMount = () => {
    dispatch(onAppMount('world'));
};
useEffect(onMount, []);
```
## Dispatched Functions with context (update, getState, dispatch)

When a function is called using dispatch, it expects arguments passed in to the outer function and the inner function returned to be async with the following json args: `{ update, getState, dispatch }`

Example of a call:
```js
dispatch(onAppMount('world'));
```

All dispatched methods **and** update calls are async and can be awaited. It also doesn't matter what file/module the functions are in, since the json args provide all the context needed for updates to state.

For example:
```js
import { helloWorld } from './hello';

export const onAppMount = (message) => async ({ update, getState, dispatch }) => {
	update('app', { mounted: true });
	update('clicked', false);
	update('data', { mounted: true });
	await update('', { data: { mounted: false } });

	console.log('getState', getState());

	update('foo.bar', { hello: true });
	update('foo.bar', { hello: false, goodbye: true });
	update('foo', { bar: { hello: true, goodbye: false } });
	update('foo.bar.goodbye', true);

	await new Promise((resolve) => setTimeout(() => {
		console.log('getState', getState());
		resolve();
	}, 2000));

	dispatch(helloWorld(message));
};
```
## Prefixing store and Provider

The default names the `State` factory method returns are `store` and `Provider`. However, if you want multiple stores and provider contexts you can pass an additional `prefix` argument to disambiguate.

```js
export const { appStore, AppProvider } = State(initialState, 'app');
```

## Performance and memo

The updating of a single store, even several levels down, is quite quick. If you're worried about components re-rendering, use `memo`:
```js
import React, { memo } from 'react';

const HelloMessage = memo(({ message }) => {
	console.log('rendered message');
	return <p>Hello { message }</p>;
});

export default HelloMessage;
```
Higher up the component hierarchy you might have:
```js
const App = () => {
	const { state, dispatch, update } = useContext(appStore);
    ...
	const handleClick = () => {
		update('clicked', !state.clicked);
	};

	return (
		<div className="root">
			<HelloMessage message={state.foo && state.foo.bar.hello} />
			<p>clicked: {JSON.stringify(state.clicked)}</p>
			<button onClick={handleClick}>Click Me</button>
		</div>
	);
};
```
When the button is clicked, the component HelloMessage will not re-render, it's value has been memoized (cached). Using this method you can easily prevent performance intensive state updates in further down components until they are neccessary.

Reference:
- https://reactjs.org/docs/context.html
- https://dmitripavlutin.com/use-react-memo-wisely/

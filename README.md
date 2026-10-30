# PropDeal

Property listings with login, favourites and seller uploads.

## Open it (no install)

Open **`index.html`** (or `login.html`). Sign in with a demo account, using the "Use Seller / Buyer / Admin" buttons:

| Role | Email | Password |
|---|---|---|
| Seller | seller@example.com | Seller@1234 |
| Buyer | buyer@example.com | Buyer@1234 |
| Admin | admin@example.com | Admin@1234 |

After login you land on the property listings. 12 sample properties are included (houses, apartments, shops, plots).
Sellers can add and delete listings. Everyone can favourite with the heart.

- Listings and favourites are saved in the browser (localStorage). All accounts in the same browser see the same listings.
- Photos load from Unsplash, so an internet connection is needed. Without it, built-in illustrations are shown.

## Put it online (GitHub Pages)

Upload `index.html`, `login.html` and `README.md` to a repo, then Settings → Pages → Branch `main`.

## With MySQL (optional, in `mysql-version/`)

Needs Node.js and MySQL. Import `schema.sql`, copy `.env.example` to `.env`, then in that folder run
`npm install`, `npm run seed`, `npm start` and open http://localhost:3000.

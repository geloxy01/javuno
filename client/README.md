# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

# Javuno

A Kanban board app (boards, lists, cards) built with React, Vite, Tailwind CSS and Firebase.
It runs on localhost with no custom server: the browser talks to Firebase Authentication and
Firestore directly, and the Firestore security rules protect the data.

## Features

- Email/password and Google sign-in
- Boards with custom backgrounds (gradients, solid colors, or an image URL)
- Lists and cards with real-time sync across tabs and users
- Drag and drop for cards and lists (mouse and touch)
- Card details: markdown description, labels, due date, checklists, comments, cover color, activity log
- Board members: invite registered users by email, assign them to cards
- Search and filters (labels, members, due date); non-matching cards are dimmed
- Keyboard shortcuts: `n` new card, `/` search, `Esc` close, `?` help
- Dark mode (remembered in your browser) and a responsive layout

## Stack

React 18+, Vite, Tailwind CSS 3, React Router, Firebase (Auth + Firestore, modular SDK),
@dnd-kit, react-markdown. JavaScript only.

## Setup

### 1. Prerequisites

- Node.js 18 or newer
- A Google account for Firebase

### 2. Install

```bash
git clone https://github.com/<your-username>/javuno.git
cd javuno/client
npm install
```

### 3. Create the Firebase project

1. In the [Firebase console](https://console.firebase.google.com), create a project (Analytics is not needed).
2. **Project settings → Your apps → Web (`</>`)**: register an app and copy the config values.
3. **Build → Authentication → Sign-in method**: enable **Email/Password** and **Google**.
   `localhost` is an authorized domain by default.
4. **Build → Firestore Database → Create database**: pick a region and start in **production mode**.
5. **Firestore → Rules**: paste the contents of `client/firestore.rules` and click **Publish**.

### 4. Configure the environment

```bash
cp .env.example .env
```

Fill in the six `VITE_FIREBASE_*` values from step 3.2. Restart the dev server after editing `.env`.
`.env` is git-ignored; never commit it.

### 5. Add the logo

Save your logo as `client/public/logo.png`. It is used as the favicon and in the navbar.

### 6. Run

```bash
npm run dev
```

Open http://localhost:5173.

## Project structure

```
client/
├── firestore.rules          Security rules (publish these in the console)
├── index.html               Title, favicon, early dark-mode script
├── tailwind.config.js       "javuno" and "javuno-dark" colors, class-based dark mode
└── src/
    ├── lib/                 Firebase, data access, positions, filters, dates
    ├── context/             Auth, theme and toast providers
    ├── components/          UI building blocks (cards, lists, modal, popovers)
    └── pages/               AuthPage, BoardsPage, BoardPage
```

## Data model (Firestore)

```
users/{uid}                         profile, emailLower (used for invites)
boards/{boardId}                    title, ownerId, memberIds[], members{uid: info}, background, starredBy[]
boards/{boardId}/lists/{id}         title, position, archived
boards/{boardId}/cards/{id}         listId, title, description, position, labelIds[], memberIds[],
                                    dueDate, dueComplete, checklists[], coverColor, commentCount, archived
boards/{boardId}/labels/{id}        name, color
boards/{boardId}/comments/{id}      cardId, authorId, text, createdAt, editedAt
boards/{boardId}/activity/{id}      type, cardId, actorId, data, createdAt
```

`position` is a number. A new item goes at the end (last + 1000). A drop between two items uses the
midpoint of its neighbors. When two neighbors get too close, the whole list is renumbered in one batch.

## Security rules in short

- Only board members can read or write a board and its subcollections.
- Only the owner can invite or remove members, and only the owner can delete the board.
- Other members can change the title, background and star, and can leave the board.
- Cards can only be assigned to board members.
- Comments can be edited only by their author; they can be deleted by the author or the owner.
- Activity entries cannot be edited.
- Users can only edit their own user document, and user queries are capped at 10 results.

## Keyboard shortcuts

| Key   | Action                                                       |
| ----- | ------------------------------------------------------------ |
| `n`   | Add a card to the list under the pointer (or the first list) |
| `/`   | Focus the search box                                         |
| `Esc` | Close the topmost popover, dialog or card; clear the search  |
| `?`   | Show the shortcuts dialog                                    |

Shortcuts are ignored while you type in a field.

## Known limitations

- **Invites are lookups, not invitations.** You can only add people who already have an account,
  and they are added immediately (no pending invite or email).
- **User search is a prefix match on email.** Any signed-in user can look up other users' emails
  (6 results at a time). For a public app, replace this with exact-match lookups or a Cloud Function.
- **Only the owner manages members.** There is no ownership transfer, and the owner cannot leave
  (delete the board instead).
- **Member names and photos are copied** onto the board when someone is added, so they go stale
  if that person later changes their profile.
- **Archived lists and cards cannot be restored from the UI.** The data stays in Firestore with
  `archived: true`.
- **Deleting boards, cards and removing members runs from the browser** in several steps. If the tab
  closes midway, leftovers (orphaned comments, etc.) can remain. A Cloud Function would make this atomic.
- **The rules cannot check everything.** They do not validate field types, and a background image URL
  is not checked server-side.
- **No keyboard drag and drop.** Dragging works with mouse and touch only.
- **Everything on a board is loaded at once** (all lists, cards and labels). Boards with thousands of
  cards will be slow.
- **Search is a simple case-insensitive match** over titles, descriptions, checklist text, label names
  and member names. There is no fuzzy search, and search is per board only.
- **"Due soon" is calculated when the page renders**, so it does not change by itself while the page
  sits open.
- **Dark mode is saved per browser**, not per account.
- **Background images are URL-only**, and some sites block hotlinking. There is no upload.
- **No password reset, email verification or notifications** (for example, due-date reminders).
- **No automated tests** for the app or the security rules.

## Troubleshooting

- **White page:** open the browser console (F12). A missing or empty `.env` is the usual cause.
- **"Could not load…" or `permission-denied`:** the rules are not published, or you are not a member
  of that board.
- **Google sign-in popup does nothing:** allow popups for localhost.
- **Invite finds nobody:** the other person must have signed up first, and you must type at least 3
  characters of their email.

# 遊戯王コレクション管理アプリ

Next.js + TypeScript + Prisma + SQLite + Tailwind CSS のPhase 1 MVPです。

## 実装済み画面

- トップ画面
- カードマスタ一覧
- カードマスタ登録・編集・詳細
- 所持カード一覧
- 所持カード登録・編集
- バインダー管理
- 9ポケット表示とカード配置
- 欲しいカードリスト
- 横断検索
- 設定画面からのCSV一括インポート
- インポートテンプレートCSV出力
- 登録済みカード一覧CSV出力
- YGOPRODeck検索結果のDBキャッシュ
- 未所持カードのバインダー表示設定
- 新規登録時のデフォルト値設定

## セットアップ

```bash
pnpm install
pnpm prisma generate
pnpm dev
```

PowerShellでnpmを使う場合は、環境によって `npm` ではなく `npm.cmd` を使ってください。

## データベース

SQLiteのDBは `prisma/dev.db` です。スキーマは `prisma/schema.prisma`、初期SQLは `prisma/migrations/000_init/migration.sql` にあります。

```bash
pnpm prisma db push
pnpm db:seed
```

## 公開環境のデータ保存

ローカル開発ではSQLiteとローカル画像保存を使います。Vercelなどに公開する場合は、永続化のためPostgreSQLと外部画像ストレージを使ってください。

## Vercel公開手順

このプロジェクトには `vercel.json` と `vercel-build` script を用意しています。Vercelでは自動的にPostgreSQL用schemaでPrisma Client生成とDB反映を行ってからNext.jsをビルドします。

ユーザー側で必要な作業は基本的に以下だけです。

1. GitHubにこのプロジェクトをpushします。
2. Neon、Supabase、Vercel PostgresなどでPostgreSQL DBを作ります。
3. VercelでGitHubリポジトリをImportします。
4. VercelのEnvironment Variablesに以下を登録します。

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
IMAGE_STORAGE_PROVIDER="url-only"
```

画像ファイルアップロードも公開環境で使う場合は、CloudinaryでUnsigned Upload Presetを作り、以下にします。

```env
IMAGE_STORAGE_PROVIDER="cloudinary"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_UPLOAD_PRESET="your-unsigned-upload-preset"
CLOUDINARY_FOLDER="duel-binder/owned-cards"
```

5. VercelでDeployします。

初回デプロイ時は `vercel-build` により `prisma db push --schema prisma/schema.postgres.prisma` が実行され、公開DBに必要なテーブルが作成されます。

### PostgreSQL

公開環境用のPrisma schemaは `prisma/schema.postgres.prisma` です。

```bash
pnpm prisma:generate:postgres
pnpm db:push:postgres
```

環境変数例:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

ローカルSQLite用の `prisma/schema.prisma` は残しているため、開発時はこれまで通り `pnpm prisma:generate` と `pnpm db:push` を使えます。

### 画像保存

画像アップロードは `IMAGE_STORAGE_PROVIDER` で切り替えます。

- `local`: `public/uploads/owned-cards` に保存。ローカル開発用です。
- `cloudinary`: Cloudinaryへアップロード。公開環境用です。
- `url-only`: ファイルアップロードを無効化し、写真URL入力だけ使います。

Cloudinaryを使う場合:

```env
IMAGE_STORAGE_PROVIDER="cloudinary"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_UPLOAD_PRESET="your-unsigned-upload-preset"
CLOUDINARY_FOLDER="duel-binder/owned-cards"
```

`IMAGE_STORAGE_PROVIDER` が未設定で `VERCEL` 環境変数がある場合は、自動的に `url-only` 扱いになります。これはVercel上のローカルファイル保存が永続化されないためです。

## CSVインポート / エクスポート

設定画面からCSVを扱えます。

- `インポートテンプレートCSV`: 一括追加用の雛形をダウンロードします。
- `登録済みカード一覧CSV`: 現在登録されている所持カード一覧をCSVでダウンロードします。
- `CSV一括追加`: CSV内のカード名をもとに既存DBとYGOPRODeckを検索し、画像が見つかった場合は自動で設定します。

CSVインポートでは `カード名` が基本の必須項目です。`型番`、`パック名`、`レアリティ`、`状態`、`枚数`、`所持ステータス`、`言語`、`購入価格`、`購入日`、`購入店舗`、`保管場所`、`メモ`、`写真URL` は任意です。

## 外部カード情報キャッシュ

YGOPRODeckへの検索結果は `ExternalCardCache` テーブルに保存されます。同じ検索語ではキャッシュを優先するため、検索とCSVインポートが速くなり、外部APIへのアクセス回数も減ります。

- キャッシュ期限: 7日
- 対象: カード検索画面、CSVインポート時の画像自動取得
- 管理: 設定画面から保存件数、期限切れ件数、最終更新を確認できます。
- 削除: 設定画面から期限切れのみ削除、または全削除できます。

## アプリ設定

設定画面の「表示とデフォルト値」は `AppSetting` テーブルに保存され、実際の登録処理と表示に反映されます。

- 未所持カード画像表示: バインダーで未所持カードをグレー表示するか、空きポケットとして表示するかを選べます。
- デフォルト所持ステータス: 新規登録、検索から追加、CSVインポートで未入力の場合に使われます。
- デフォルト枚数: 新規登録、検索から追加、CSVインポートで未入力の場合に使われます。
- デフォルト状態: 新規登録、検索から追加、CSVインポートで未入力の場合に使われます。
- デフォルト言語: 新規登録、検索から追加、CSVインポートで未入力の場合に使われます。
- デフォルト保管場所: 新規登録、検索から追加、CSVインポートで未入力の場合に使われます。

## Phase 1のメモ

カードマスタは `imageUrl`、所持カードは `photoUrl` として分けています。所持カードはローカル画像アップロードにも対応しており、公開環境ではCloudinaryなどの外部ストレージに切り替えられます。

バインダーは `Binder` と `BinderSlot` で管理しています。`/binders` がバインダー管理一覧、`/binders/[id]` が個別バインダー画面です。1ページは9ポケットで、`BinderSlot.pageNumber` と `BinderSlot.pocketNumber` により配置を保持します。

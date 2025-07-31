# リフレッシュトークン機能の実装方法

## 1. Prisma スキーマに RefreshToken モデルを追加

```prisma
model RefreshToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique @db.VarChar(500)
  adminId   Int      @map("admin_id")
  expiresAt DateTime @map("expires_at") @db.Timestamptz(6)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  isRevoked Boolean  @default(false) @map("is_revoked")
  
  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([adminId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model Admin {
  id           Int      @id @default(autoincrement())
  username     String   @unique @db.VarChar(100)
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  refreshTokens RefreshToken[]

  @@map("admins")
}
```

## 2. マイグレーション実行

```bash
npx prisma migrate dev --name add-refresh-tokens
npx prisma generate
```

## 3. PrismaAuthRepository の実装を復活

```typescript
async saveRefreshToken(adminId: number, refreshToken: string, expiresAt: Date): Promise<void> {
  await this.prisma.refreshToken.create({
    data: {
      token: refreshToken,
      adminId,
      expiresAt,
    }
  });
}

async findValidRefreshToken(token: string): Promise<{ adminId: number; expiresAt: Date } | null> {
  const refreshToken = await this.prisma.refreshToken.findUnique({
    where: { 
      token,
      expiresAt: { gt: new Date() },
      isRevoked: false
    }
  });

  if (!refreshToken) {
    return null;
  }

  return {
    adminId: refreshToken.adminId,
    expiresAt: refreshToken.expiresAt,
  };
}
```

## 4. AuthService でリフレッシュトークン生成ロジックを追加

```typescript
async generateRefreshToken(adminId: number): Promise<string> {
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 日間
  
  await this.authRepository.saveRefreshToken(adminId, refreshToken, expiresAt);
  return refreshToken;
}
```
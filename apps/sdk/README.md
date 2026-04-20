# LightCircle NodeJS SDK

This is the NodeJS SDK for [LightCircle](https://lightcircle.vn).

You can start by installing the package:

```bash
npm install @lightcircle/node
```

## Usage
```typescript
import LightCircle from '@lightcircle/node';
const lightcircle = new LightCircle('your api key', 'your self-hosted instance (optional)');
```

The available methods are:
- `post(posts: CreatePostDto)` - Schedule a post to LightCircle
- `postList(filters: GetPostsDto)` - Get a list of posts
- `upload(file: Buffer, extension: string)` - Upload a file to LightCircle
- `integrations()` - Get a list of connected channels
- `deletePost(id: string)` - Delete a post by ID

Alternatively you can use the SDK with curl, check the [LightCircle API documentation](https://docs.lightcircle.vn/public-api) for more information.
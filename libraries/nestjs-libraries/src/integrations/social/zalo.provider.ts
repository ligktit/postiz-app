import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { ZaloDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/zalo.dto';
import { Integration } from '@prisma/client';

export class ZaloProvider extends SocialAbstract implements SocialProvider {
  identifier = 'zalo';
  name = 'Zalo OA';
  isBetweenSteps = false;
  scopes = ['oa.message', 'oa.profile'];
  override maxConcurrentJob = 5;
  editor = 'normal' as const;
  
  maxLength() {
    return 500;
  }
  
  dto = ZaloDto;

  override handleErrors(
    body: string,
    status: number
  ):
    | {
        type: 'refresh-token' | 'bad-body';
        value: string;
      }
    | undefined {
    if (status === 401 || body.includes('-216')) { // Access token expired/invalid
      return {
        type: 'refresh-token',
        value: 'Zalo access token expired. Please re-authenticate.',
      };
    }
    return undefined;
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const response = await (
      await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          secret_key: process.env.ZALO_APP_SECRET as string,
        },
        body: new URLSearchParams({
          app_id: process.env.ZALO_APP_ID as string,
          grant_type: 'refresh_token',
          refresh_token,
        }),
      })
    ).json();

    if (!response.access_token) {
      throw new Error('Failed to refresh Zalo token');
    }

    return {
      refreshToken: response.refresh_token,
      expiresIn: parseInt(response.expires_in, 10),
      accessToken: response.access_token,
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    // Note: Zalo uses code_challenge for PKCE but currently let's use state for basic OAuth
    return {
      url:
        'https://oauth.zaloapp.com/v4/oa/permission' +
        `?app_id=${process.env.ZALO_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${process.env.FRONTEND_URL}/integrations/social/zalo`
        )}` +
        `&state=${state}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const response = await (
      await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          secret_key: process.env.ZALO_APP_SECRET as string,
        },
        body: new URLSearchParams({
          app_id: process.env.ZALO_APP_ID as string,
          grant_type: 'authorization_code',
          code: params.code,
        }),
      })
    ).json();

    if (!response.access_token) {
      throw new Error('Failed to authenticate with Zalo');
    }

    const { access_token, refresh_token, expires_in } = response;

    const oaInfoResponse = await (
      await fetch(`https://openapi.zalo.me/v2.0/oa/getoa?access_token=${access_token}`)
    ).json();

    const oaInfo = oaInfoResponse.data || {};

    return {
      id: oaInfo.oa_id || makeId(10),
      name: oaInfo.name || 'Zalo OA',
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: parseInt(expires_in, 10),
      picture: oaInfo.avatar || '',
      username: oaInfo.name || 'zalo_oa',
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<ZaloDto>[]
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;

    if (firstPost?.media?.[0]?.type === 'video') {
       throw new Error('Video is not natively supported directly on Zalo via basic API yet.');
    }

    const messagePayload: any = {
      recipient: {
        message_id: 'ALL', // Or handle specific broadcast semantics
      },
      message: {
        text: firstPost.message,
      },
    };

    if (firstPost?.media?.length) {
       messagePayload.message.attachment = {
          type: 'template',
          payload: {
              template_type: 'media',
              elements: [{
                  media_type: 'image',
                  url: firstPost.media[0].path
              }]
          }
       };
    }

    const response = await (
      await this.fetch(
        `https://openapi.zalo.me/v3.0/oa/message/broadcast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            access_token: accessToken,
          },
          body: JSON.stringify(messagePayload),
        },
        'broadcast zalo'
      )
    ).json();
    
    if (response.error) {
       throw new Error(response.message || 'Error broadcasting to Zalo');
    }

    return [
      {
        id: firstPost.id,
        postId: response.data?.message_id || makeId(10),
        releaseURL: '', // Zalo doesn't return raw URL for broadcast
        status: 'success',
      },
    ];
  }
}

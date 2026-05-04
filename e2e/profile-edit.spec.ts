import { test, expect } from '@playwright/test';

type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
};

async function mockAuthenticatedSession(page: import('@playwright/test').Page, profileOverrides: Partial<Profile> = {}) {
  let profile: Profile = {
    id: 'user-1',
    email: 'before@example.com',
    display_name: 'Before Name',
    avatar_url: 'https://example.com/before.png',
    ...profileOverrides,
  };
  let patchRequestCount = 0;

  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'access-token');
    localStorage.setItem('refresh_token', 'refresh-token');
  });

  await page.route('**/api/users/me/**', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ json: profile });
      return;
    }

    if (request.method() === 'PATCH') {
      patchRequestCount += 1;
      const payload = request.postDataJSON() as Partial<Profile>;
      profile = {
        ...profile,
        ...payload,
        avatar_url: payload.avatar_url ?? null,
      };
      await route.fulfill({ json: profile });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/characters/**', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/instances/**', async (route) => {
    await route.fulfill({ json: [] });
  });

  return {
    getProfile: () => profile,
    getPatchRequestCount: () => patchRequestCount,
  };
}

test.describe('Profile Edit', () => {
  test('인증된 사용자가 프로필을 수정하면 대시보드에 반영된다', async ({ page }) => {
    const session = await mockAuthenticatedSession(page);

    await page.goto('/profile/edit');

    await expect(page.getByRole('heading', { name: '프로필 편집' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '표시 이름' })).toHaveValue('Before Name');
    await expect(page.getByRole('textbox', { name: '이메일' })).toHaveValue('before@example.com');
    await expect(page.getByRole('textbox', { name: '아바타 URL' })).toHaveValue('https://example.com/before.png');

    await page.getByRole('textbox', { name: '표시 이름' }).fill('After Name');
    await page.getByRole('textbox', { name: '이메일' }).fill('after@example.com');
    await page.getByRole('textbox', { name: '아바타 URL' }).fill('https://example.com/after.png');
    await page.getByRole('button', { name: '저장' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('프로필이 저장되었습니다.')).toBeVisible();
    await expect(page.getByText('After Name')).toBeVisible();
    await expect(page.getByText('after@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: '프로필 편집' })).toBeVisible();

    expect(session.getProfile()).toMatchObject({
      display_name: 'After Name',
      email: 'after@example.com',
      avatar_url: 'https://example.com/after.png',
    });
    expect(session.getPatchRequestCount()).toBe(1);
  });

  test('잘못된 이메일이면 저장 요청을 보내지 않는다', async ({ page }) => {
    const session = await mockAuthenticatedSession(page);

    await page.goto('/profile/edit');

    await page.getByRole('textbox', { name: '이메일' }).fill('invalid-email');
    await page.getByRole('button', { name: '저장' }).click();

    await expect(page.getByText('올바른 이메일 주소를 입력해 주세요.')).toBeVisible();
    await expect(page).toHaveURL(/\/profile\/edit$/);
    expect(session.getPatchRequestCount()).toBe(0);
  });

  test('아바타 URL을 비우면 null로 저장된다', async ({ page }) => {
    const session = await mockAuthenticatedSession(page);

    await page.goto('/profile/edit');

    await page.getByRole('textbox', { name: '아바타 URL' }).fill('   ');
    await page.getByRole('button', { name: '저장' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(session.getPatchRequestCount()).toBe(1);
    expect(session.getProfile().avatar_url).toBeNull();
  });

  test('서버 오류면 편집 페이지에 머무르고 에러 토스트를 표시한다', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'access-token');
      localStorage.setItem('refresh_token', 'refresh-token');
    });

    await page.route('**/api/users/me/**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          json: {
            id: 'user-1',
            email: 'before@example.com',
            display_name: 'Before Name',
            avatar_url: null,
          },
        });
        return;
      }

      if (request.method() === 'PATCH') {
        await route.fulfill({ status: 500, json: { detail: 'boom' } });
        return;
      }

      await route.fallback();
    });

    await page.route('**/api/characters/**', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.route('**/api/instances/**', async (route) => {
      await route.fulfill({ json: [] });
    });

    await page.goto('/profile/edit');
    await page.getByRole('textbox', { name: '표시 이름' }).fill('Fail Name');
    await page.getByRole('button', { name: '저장' }).click();

    await expect(page).toHaveURL(/\/profile\/edit$/);
    await expect(page.getByRole('heading', { name: '프로필 편집' })).toBeVisible();
    await expect(page.getByText('프로필 저장에 실패했습니다.')).toBeVisible();
  });
});

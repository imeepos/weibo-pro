import { useEntityManager, WeiboAccountEntity, WeiboAccountStatus } from '@sker/entities';

async function checkWeiboAccounts() {
  try {
    console.log('=== 检查微博账号状态 ===');

    const accounts = await useEntityManager(async m => {
      return m.find(WeiboAccountEntity, {
        select: ['id', 'weiboUid', 'weiboNickname', 'status', 'lastCheckAt']
      });
    });

    console.log(`总共找到 ${accounts.length} 个微博账号:`);

    accounts.forEach(account => {
      console.log(`- ID: ${account.id}, UID: ${account.weiboUid}, 昵称: ${account.weiboNickname}, 状态: ${account.status}, 最后检查: ${account.lastCheckAt}`);
    });

    const activeAccounts = accounts.filter(acc => acc.status === WeiboAccountStatus.ACTIVE);
    console.log(`\n其中 ${activeAccounts.length} 个账号状态为 ACTIVE:`);

    activeAccounts.forEach(account => {
      console.log(`- ID: ${account.id}, UID: ${account.weiboUid}, 昵称: ${account.weiboNickname}`);
    });

  } catch (error) {
    console.error('检查微博账号时出错:', error);
  }
}

checkWeiboAccounts();
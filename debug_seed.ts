
import { User } from './src/models/User';
import { UserProfile } from './src/models/UserProfile';
import { sequelize } from './src/config/database';

async function test() {
  try {
    await sequelize.authenticate();
    console.log('DB Connected. Querying User...');
    const user = await User.findOne();
    console.log('User found:', user ? user.id : 'none');

    console.log('Querying UserProfile...');
    const profile = await UserProfile.findOne();
    console.log('Profile found:', profile ? profile.id : 'none');
    
  } catch (e: any) {
    console.error('ERROR:', e.message);
    if (e.original) {
        console.error('PG ERROR MSG:', e.original.message);
    }
  } finally {
    await sequelize.close();
  }
}
test();


import { sequelize, Order, User } from './src/models';

async function checkOrders() {
    try {
        const userId = '5eea7039-c2bd-488e-b752-baf40c28e401';
        console.log('Checking orders for user:', userId);
        
        const orders = await Order.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: 3
        });

        console.log(`Found ${orders.length} orders.`);
        
        orders.forEach((o: any) => {
            console.log('\n------------------------------------------------');
            console.log(`Order ID: ${o.id}`);
            console.log(`Group ID: ${o.order_group_id}`);
            console.log(`Shipment Details:`, JSON.stringify(o.shipment_details, null, 2));
            console.log(`Transaction Details:`, JSON.stringify(o.transaction_details, null, 2));
            console.log(`Payment Status: ${o.payment_status}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkOrders();

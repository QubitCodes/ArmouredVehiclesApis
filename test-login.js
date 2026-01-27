// Native fetch used


async function testLogin() {
    try {
        const response = await fetch('http://localhost:3002/api/v1/auth/otp/login/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ identifier: 'superadmin@example.com' })
        });

        console.log('Status:', response.status);
        // console.log('Headers:', response.headers); 

        const text = await response.text();
        console.log('Body:', text);
    } catch (error) {
        console.error('Error:', error);
    }
}

testLogin();

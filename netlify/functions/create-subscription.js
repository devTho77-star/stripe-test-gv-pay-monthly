// netlify/functions/create-subscription.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { amount, currency, donation_by, name, email, phone, address } = JSON.parse(event.body);

    if (!amount || amount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    // 1. Create a product for recurring donation
    const product = await stripe.products.create({
      name: 'Monthly Donation',
      description: donation_by || 'Recurring donation',
    });

    // 2. Create a price for the subscription
    const price = await stripe.prices.create({
      unit_amount: amount,
      currency: currency,
      recurring: { interval: 'month' },
      product: product.id,
    });

    // 3. Create a Stripe Customer with billing details
    const customer = await stripe.customers.create({
      name: name,
      email: email,
      phone: phone,
      address: {
        line1: address.line1,
        line2: address.line2 || '',
        city: address.city,
        state: address.state || '',
        postal_code: address.postal_code,
        country: address.country,
      },
    });

    // 4. Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    // Return the client secret and subscription ID to confirm payment on frontend
    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        clientSecret, 
        subscriptionId: subscription.id,
        customerId: customer.id
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

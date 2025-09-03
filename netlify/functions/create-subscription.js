const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { amount, currency, interval, donation_by } = JSON.parse(event.body);

    // 1. Create a customer
    const customer = await stripe.customers.create({
      description: donation_by || 'Monthly donor',
    });

    // 2. Create a product for the subscription (if needed)
    const product = await stripe.products.create({
      name: 'Monthly Donation',
    });

    // 3. Create a price for the subscription
    const price = await stripe.prices.create({
      unit_amount: amount,
      currency: currency,
      recurring: { interval: interval },
      product: product.id,
    });

    // 4. Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

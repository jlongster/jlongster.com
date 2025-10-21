import { Form, useActionData } from '@remix-run/react';
import { json, redirect } from '@remix-run/node';
import { Layout } from '../layout';
import { addNewsletterSignup } from '../db/newsletter';

export async function action({ request }) {
  const formData = await request.formData();
  const email = formData.get('email');
  const description = formData.get('description');

  try {
    await addNewsletterSignup(email, description);
    return json({
      success: true,
      message: 'Thank you for joining the waitlist!',
    });
  } catch (error) {
    console.log(error);
    return json(
      {
        success: false,
        message: 'Something went wrong. Please try again.',
      },
      { status: 500 },
    );
  }
}

export default function Newsletter(props) {
  const actionData = useActionData();

  return (
    <Layout className="newsletter">
      <h3>Interested in my newsletter?</h3>
      <p>
        I've always loved the idea of an "investor update" style newsletter.
        Instead of a startup updating investors, I would update people invested
        in my ideas. Instead of investing money, people invest time and
        interest.
      </p>

      <p>
        For projects where I'm working alone, this would help keep me
        accountable to ship. It would also give me a place to ask questions;
        better than social media because it's small and very high signal to
        noise.
      </p>

      <p>
        Now that I left Stripe, I will be doing a lot of solo projects for a
        while so let's try this out. Maybe this dies after a week, we'll see.
      </p>

      <h3>Join the waitlist</h3>

      <p>
        I'm looking for ambitious people with experience in creating software
        from scratch. People with an eye for design. I want to keep this very
        small at the start which why this is a waitlist. It will allow me to be
        more honest and vulnerable.
      </p>

      <p>
        What you will get: an email every few days with updates about how my
        work is going, what I have learned, and some questions around what I'm
        struggling with.
      </p>

      {actionData?.success ? (
        <p className="text-sm text-green-600 font-semibold text-center">
          {actionData.message}
        </p>
      ) : (
        <Form method="post" className="flex flex-col gap-4 mt-8 text-sm">
          {actionData?.success === false && (
            <p className="text-sm text-red-600 font-semibold">
              {actionData.message}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-semibold">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="your@email.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="font-semibold">
              What's your background?
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              placeholder="Tell me more about you!"
            />
          </div>

          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded font-semibold transition-opacity self-end focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Join Waitlist
          </button>
        </Form>
      )}
    </Layout>
  );
}

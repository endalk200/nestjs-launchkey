import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface IPasswordResetCodeTemplate {
  applicationName: string;
  code: string;
  supportEmail: string;
  expirationInMinutes: string;
}

export const PasswordResetCodeTemplate = ({
  applicationName = "Acme",
  code = "521963",
  supportEmail = "support@acme.com",
  expirationInMinutes = "15",
}: IPasswordResetCodeTemplate) => {
  return (
    <Html>
      <Head />
      <Preview>Reset Your Password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={coverSection}>
            <Section style={imageSection}>
              {/* <Img */}
              {/*   src={`https://react-email-demo-k6qpz0pxq-resend.vercel.app/static/aws-logo.png`} */}
              {/*   width="75" */}
              {/*   height="45" */}
              {/*   alt="AWS's Logo" */}
              {/* /> */}
              <Heading style={companyHeader}>{applicationName}</Heading>
            </Section>
            <Section style={upperSection}>
              <Heading style={h1}>Reset Your Password</Heading>
              <Text style={mainText}>
                We received a request to reset the password for your{" "}
                {applicationName} account. To ensure your account's security,
                please use the verification code below to proceed with the
                password reset process.
              </Text>
              <Section style={verificationSection}>
                <Text style={verifyText}>Verification code</Text>

                <Text style={codeText}>{code}</Text>
                <Text style={validityText}>
                  (This code is valid for {expirationInMinutes} minutes)
                </Text>
              </Section>
            </Section>
            <Hr />
            <Section style={lowerSection}>
              <Text style={cautionText}>
                If you did not request a password reset, please disregard this
                message. Your account will remain secure.
              </Text>
            </Section>
          </Section>
          <Text style={footerText}>
            Contact <Link href={`mailto:${supportEmail}`}>support</Link> All
            rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetCodeTemplate;

const main = {
  backgroundColor: "#fff",
  color: "#212121",
};

const companyHeader = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "30px",
  color: "#FFFF",
};

const container = {
  padding: "20px",
  margin: "0 auto",
  backgroundColor: "#eee",
};

const h1 = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "20px",
  fontWeight: "bold",
  marginBottom: "15px",
};

const link = {
  color: "#2754C5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  textDecoration: "underline",
};

const text = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  margin: "24px 0",
};

const imageSection = {
  backgroundColor: "#252f3d",
  display: "flex",
  padding: "20px 0",
  alignItems: "center",
  justifyContent: "center",
};

const coverSection = { backgroundColor: "#fff" };

const upperSection = { padding: "25px 35px" };

const lowerSection = { padding: "25px 35px" };

const footerText = {
  ...text,
  fontSize: "12px",
  padding: "0 20px",
};

const verifyText = {
  ...text,
  margin: 0,
  fontWeight: "bold",
  textAlign: "center" as const,
};

const codeText = {
  ...text,
  fontWeight: "bold",
  fontSize: "36px",
  margin: "10px 0",
  textAlign: "center" as const,
};

const validityText = {
  ...text,
  margin: "0px",
  textAlign: "center" as const,
};

const verificationSection = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const mainText = { ...text, marginBottom: "14px" };

const cautionText = { ...text, margin: "0px" };

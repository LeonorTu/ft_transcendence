import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import styled from 'styled-components';
import img from '/Pixel-art-not-found.png'

// Styled components
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 0 20px;
`;

const ErrorHeading = styled.h1`
  font-size: clamp(3rem, 10vw, 8rem); /* Responsive font size */
  font-size: 5rem;
  margin-bottom: 6rem;
  color: rgb(255, 255, 255);
  font-weight: bold;
`;

const ErrorContent = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
`;

const HomeButton = styled(Link)`
  background-color: rgb(8, 8, 8);
  color: white;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.25rem;
  transition: background-color 0.3s;

  &:hover {
    background-color: #fff; /* Change background to white */
    color: #000; /* Change font color to black */
  }
`;

const Error: React.FC = () => {
  const error = useRouteError();
  console.log(error);

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorContainer>
        <ErrorContent>
          <img src={img} alt="not found" />
          <ErrorHeading>Page Not Found</ErrorHeading>
          <HomeButton to="/">back home</HomeButton>
        </ErrorContent>
      </ErrorContainer>
    );
  }

  return (
    <ErrorContainer>
      <ErrorHeading style={{ fontSize: '3rem' }}>
        Something Went Wrong
      </ErrorHeading>
      <HomeButton to="/">back home</HomeButton>
    </ErrorContainer>
  );
};

export default Error;

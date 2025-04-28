import styled from 'styled-components';

interface FormInputProps {
  label: string;
  name: string;
  type: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.8rem;
  color: #ccc;
  text-transform: uppercase;
`;

const Input = styled.input`
  padding: 0.8rem;
  background-color: rgba(30, 30, 30, 0.6);
  border: 2px solid #444;
  color: white;
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;
  transition: all 0.3s;

  &:focus {
    outline: none;
    border-color: #00ffaa;
    box-shadow: 0 0 10px rgba(0, 255, 170, 0.3);
  }
`;

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type,
  value,
  defaultValue,
  onChange,
  required = false,
}) => {
  return (
    <FormGroup>
      <Label htmlFor={name}>{label}</Label>
      <Input
        type={type}
        name={name}
        id={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        required={required}
      />
    </FormGroup>
  );
};

export default FormInput;

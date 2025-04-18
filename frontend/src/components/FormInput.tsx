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
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;
  color: #fff;
  text-transform: capitalize;
`;

const Input = styled.input`
  padding: 0.75rem;
  background: #2a2a2a;
  border: 1px solid #333;
  color: #fff;
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;

  &:focus {
    outline: 2px solid rgb(182, 58, 62);
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

import styled from "styled-components";

interface FormInputProps {
  label: string;
  name: string;
  type: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    outline: 2px solid #646cff;
  }
`;

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type,
  value,
  defaultValue,
  onChange,
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
      />
    </FormGroup>
  );
};

export default FormInput;